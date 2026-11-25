// How a thing's row sits in a SQL store: the column rules the server's store and prove's world reader share.
import { Schema, SchemaAST } from "effect";
import type { Thing } from "../types.ts";

// D1 holds text, numbers and nulls (STO-23). What a field's schema encodes to decides how its column holds it, never the
// value's text, so a string that happens to start with `[` stays a string:
//   - an array, a struct, an unknown, or a union that is not only strings is kept as its JSON and read back from it;
//     a list read filtering on such a field compares the JSON text, so it matches an exact value only;
//   - a boolean goes in as 1 or 0 and comes back as a boolean, whichever way the column's affinity read it;
//   - an optional or nullable field is NULL when it has no value, and its key is left out when the row is read back.
const encodedOf = (thing: Thing, k: string) => {
  const f = thing.fields[k];
  return f?.value.meta.type === "schema" ? SchemaAST.toEncoded((f.value.schema as Schema.Top).ast) : undefined;
};
/** Does a member of a union encode to plain text, or to nothing at all (null)? */
const isPlainMember = (ast: SchemaAST.AST): boolean => ast._tag === "String" || ast._tag === "Null" || (ast._tag === "Literal" && typeof ast.literal === "string");
const kindOf = (thing: Thing, k: string): "json" | "boolean" | "plain" => {
  const ast = encodedOf(thing, k);
  if (ast === undefined) return "plain";
  switch (ast._tag) {
    case "Arrays": case "Objects": case "Unknown": case "Any": case "ObjectKeyword": return "json";
    case "Boolean": return "boolean";
    case "Union": {
      if (ast.types.every(isPlainMember)) return "plain";
      return ast.types.every((m) => m._tag === "Boolean" || m._tag === "Null" || (m._tag === "Literal" && typeof m.literal === "boolean")) ? "boolean" : "json";
    }
    default: return "plain";
  }
};
/** May the field hold no value: left out (`Blueprint.optional`) or null (a union with null)? */
const nullable = (thing: Thing, k: string) => {
  if (thing.fields[k]?.value.optional === true) return true;
  const ast = encodedOf(thing, k);
  return ast?._tag === "Union" && ast.types.some((m) => m._tag === "Null");
};

/** One encoded field as its column holds it. */
export const toColumn = (thing: Thing, k: string, v: unknown) => {
  if (v === undefined) return v;
  const kind = kindOf(thing, k);
  if (kind === "boolean") return typeof v === "boolean" ? (v ? 1 : 0) : v;
  if (kind === "json") return v === null && nullable(thing, k) ? null : JSON.stringify(v);
  return v;
};
const fromColumn = (thing: Thing, k: string, v: unknown) => {
  if (v === null || v === undefined) return v;
  const kind = kindOf(thing, k);
  if (kind === "json") return typeof v === "string" ? (JSON.parse(v) as unknown) : v;
  if (kind === "boolean") return v === 1 || v === "1" ? true : v === 0 || v === "0" ? false : v;
  return v;
};

/** A stored row's columns back in their encoded shape, ready for the thing's schema to decode. */
export const fromColumns = (thing: Thing, row: Record<string, unknown>): Record<string, unknown> =>
  // A column that is NULL holds no value: an optional field's key is then left out, as its schema says it may be.
  Object.fromEntries(
    Object.entries(row).flatMap(([k, v]) => (v === null && thing.fields[k]?.value.optional === true ? [] : [[k, fromColumn(thing, k, v)] as const])),
  );
