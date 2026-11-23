// Whether a value may be null: its encoded form is a union with null, so the column that holds it may be NULL too (an optional value says so on its own).
import { SchemaAST, type Schema } from "effect";
import type { Value } from "orthograph";

export const isNullable = (value: Value): boolean => {
  if (value.meta.type !== "schema") return false;
  const ast = SchemaAST.toEncoded((value.schema as Schema.Top).ast);
  return ast._tag === "Union" && ast.types.some((m) => m._tag === "Null");
};
