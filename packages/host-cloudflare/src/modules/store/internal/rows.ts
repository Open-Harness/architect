// A thing's rows in their wire form: every field as its schema encodes it (text for ids and amounts).
import { Effect, Schema } from "effect";
import type { Thing } from "orthograph";
import { fromColumns, structOf, toColumn } from "orthograph/server";
import type { Instance } from "@orthograph/language-effect";

type Codec = Schema.Codec<Record<string, unknown>, Record<string, unknown>>;

const codecOf = (thing: Thing, keys?: ReadonlyArray<string>) =>
  structOf(keys ? Object.fromEntries(keys.map((k) => [k, thing.fields[k]!])) : thing.fields) as unknown as Codec;

// How each column holds its field (STO-23) is shared with prove's world reader: `toColumn` and `fromColumns` in `orthograph/server`.

/** A stored row back to an instance: its fields decoded, its state kept. */
export const decodeRow = (thing: Thing, row: Record<string, unknown>) =>
  Effect.gen(function* () {
    const fields = yield* Schema.decodeUnknownEffect(codecOf(thing))(fromColumns(thing, row));
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
