// The facts door answers a row as its columns hold it: a boolean as 1 or 0, an array, a struct or an unknown as its JSON text, an absent optional as NULL
// (`host-cloudflare/.../store/internal/rows.ts` writes them so). A role's rule reads the instance as the server reads it, so a row is turned back into
// the fields its thing declares before it is decoded. The same three rules as the store's `fromColumn`.
import { SchemaAST, type Schema } from "effect";
import type { Thing } from "orthograph";

type Kind = "json" | "boolean" | "plain";

const isPlainMember = (ast: SchemaAST.AST): boolean => ast._tag === "String" || ast._tag === "Null" || (ast._tag === "Literal" && typeof ast.literal === "string");

const kindOf = (thing: Thing, key: string): Kind => {
  const field = thing.fields[key];
  if (field?.value.meta.type !== "schema") return "plain";
  const ast = SchemaAST.toEncoded((field.value.schema as Schema.Top).ast);
  switch (ast._tag) {
    case "Arrays": case "Objects": case "Unknown": case "Any": case "ObjectKeyword": return "json";
    case "Boolean": return "boolean";
    case "Union":
      return ast.types.every(isPlainMember) ? "plain"
        : ast.types.every((m) => m._tag === "Boolean" || m._tag === "Null" || (m._tag === "Literal" && typeof m.literal === "boolean")) ? "boolean" : "json";
    default: return "plain";
  }
};

/** A row's columns as the fields they hold: booleans back from 1 and 0, JSON back from text, an absent optional's NULL left out. */
export const fieldsOfRow = (thing: Thing, row: Readonly<Record<string, unknown>>): Record<string, unknown> =>
  Object.fromEntries(Object.entries(row).flatMap(([key, value]) => {
    if (value === null || value === undefined) return thing.fields[key]?.value.optional === true ? [] : [[key, value] as const];
    const kind = kindOf(thing, key);
    if (kind === "json") return [[key, typeof value === "string" ? (JSON.parse(value) as unknown) : value] as const];
    if (kind === "boolean") return [[key, value === 1 || value === "1" ? true : value === 0 || value === "0" ? false : value] as const];
    return [[key, value] as const];
  }));
