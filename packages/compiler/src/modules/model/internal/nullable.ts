// What a value's encoded form is: a union with null (so the column that holds it may be NULL too; an optional value says so on its own),
// or a list or an object (so a command line takes it as JSON).
import { SchemaAST, type Schema } from "effect";
import type { Value } from "orthograph";

const encoded = (value: Value) => SchemaAST.toEncoded((value.schema as Schema.Top).ast);

export const isNullable = (value: Value): boolean => {
  if (value.meta.type !== "schema") return false;
  const ast = encoded(value);
  return ast._tag === "Union" && ast.types.some((m) => m._tag === "Null");
};

/**
 * A plain schema value (or a `Blueprint.list`) that travels as a list or an object, null aside: "list" or "object". Undefined for any other,
 * a value that travels as text (`Schema.fromJsonString`) and an any-thing reference (which says so in its format) among them.
 */
export const jsonShape = (value: Value): "list" | "object" | undefined => {
  if (value.meta.type !== "schema" || (value.meta.format !== undefined && value.meta.format !== "list")) return undefined;
  const ast = encoded(value);
  const kinds = new Set((ast._tag === "Union" ? ast.types : [ast]).filter((m) => m._tag !== "Null" && m._tag !== "Undefined").map((m) => m._tag));
  return kinds.size !== 1 ? undefined : kinds.has("Arrays") ? "list" : kinds.has("Objects") ? "object" : undefined;
};
