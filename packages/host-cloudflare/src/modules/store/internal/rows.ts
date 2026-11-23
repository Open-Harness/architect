// A thing's rows in their wire form: every field as its schema encodes it (text for ids and amounts).
import { Effect, Schema, SchemaAST } from "effect";
import type { Thing } from "orthograph";
import { structOf } from "orthograph/server";
import type { Instance } from "@orthograph/language-effect";

type Codec = Schema.Codec<Record<string, unknown>, Record<string, unknown>>;

const codecOf = (thing: Thing, keys?: ReadonlyArray<string>) =>
  structOf(keys ? Object.fromEntries(keys.map((k) => [k, thing.fields[k]!])) : thing.fields) as unknown as Codec;

// D1 holds text, numbers and nulls (STO-23). A field whose encoded form is an array or a struct (a
// `Blueprint.value(Schema.Array(...))`) is kept as its JSON and read back from it. The field's schema decides, never
// the text, so a string that happens to start with `[` stays a string. A list read filtering on such a field compares
// the JSON text, so it matches an exact value only, not containment. A nullable array (a union) is not detected yet.
const isJson = (thing: Thing, k: string) => {
  const f = thing.fields[k];
  const tag = f?.value.meta.type === "schema" ? SchemaAST.toEncoded((f.value.schema as Schema.Top).ast)._tag : undefined;
  return tag === "Arrays" || tag === "Objects";
};
const toColumn = (thing: Thing, k: string, v: unknown) => (isJson(thing, k) && v !== null && v !== undefined ? JSON.stringify(v) : v);
const fromColumn = (thing: Thing, k: string, v: unknown) => (isJson(thing, k) && typeof v === "string" ? (JSON.parse(v) as unknown) : v);

/** A stored row back to an instance: its fields decoded, its state kept. */
export const decodeRow = (thing: Thing, row: Record<string, unknown>) =>
  Effect.gen(function* () {
    const parsed = Object.fromEntries(Object.entries(row).map(([k, v]) => [k, fromColumn(thing, k, v)]));
    const fields = yield* Schema.decodeUnknownEffect(codecOf(thing))(parsed);
    const instance = (typeof row["state"] === "string" ? { ...fields, state: row["state"] } : fields) as Instance;
    return { instance, version: Number(row["version"] ?? 0) };
  }).pipe(Effect.orDie);

/** Some fields of an instance, encoded: all of them for an insert, the changed ones for an update. */
export const encodeFields = (thing: Thing, fields: Instance, partial: boolean) =>
  Effect.gen(function* () {
    const keys = Object.keys(fields).filter((k) => k !== "state");
    const values = Object.fromEntries(keys.map((k) => [k, fields[k]]));
    const encoded = yield* Schema.encodeEffect(codecOf(thing, partial ? keys : undefined))(values);
    return Object.fromEntries(Object.entries(encoded).map(([k, v]) => [k, toColumn(thing, k, v)]));
  }).pipe(Effect.orDie);

/** Did this failure come from a version guard that lost? (`version` set to NULL on a `NOT NULL` column.) */
export const lostGuard = (error: unknown): boolean => {
  // D1's message sits a few causes down: SqlError, then its UnknownError, then D1's own Error.
  for (let e: unknown = error, depth = 0; e !== undefined && e !== null && depth < 8; e = (e as { cause?: unknown }).cause, depth++) {
    const message = String((e as { message?: unknown }).message ?? e);
    // A stale version, or another call that committed the same request key first: either way, run the call again.
    if (/NOT NULL constraint failed: [\w"]+\.version\b/.test(message) || /UNIQUE constraint failed: _requests\.key/.test(message)) return true;
  }
  return false;
};
