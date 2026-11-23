// Whether two values are the same schema (S-33): a refusal field must be the key field's own value, because the runtime copies the caller's row value into it.
import type { FieldInput, Value } from "orthograph";

/** The value a field input stands for: the value itself, or a thing field's value. */
export const valueOfInput = (input: FieldInput): Value => (input.kind === "field" ? input.value : input);

/** What a value's schema checks, in the words each check describes itself with (`a value with a length of at most 254`). */
const checksOf = (v: Value): string => {
  const ast = v.schema.ast as { readonly checks?: ReadonlyArray<{ readonly annotations?: { readonly expected?: unknown } }> };
  return JSON.stringify((ast.checks ?? []).map((c) => c.annotations?.expected ?? null));
};

/**
 * Strict equality. A value whose schema has no named type (`meta.type` is "schema") is equal only to the same schema object, since two
 * schemas cannot be compared by what they accept. Any other value is equal when its kind of type and the type's own numbers match and its schema makes the same checks (`email()` and `text({ max: 254 })` share a meta, but only the email checks the pattern).
 */
export const sameValue = (a: Value, b: Value): boolean => {
  if (a.schema === b.schema) return true;
  if (a.meta.type === "schema" || b.meta.type === "schema") return false;
  return JSON.stringify(a.meta) === JSON.stringify(b.meta) && checksOf(a) === checksOf(b);
};

/** A value in a few words for a message: `text of at most 40 characters`. */
export const describeValue = (v: Value): string => {
  switch (v.meta.type) {
    case "id": return `an id with the prefix ${v.meta.prefix}`;
    case "uint": return `a ${v.meta.bits}-bit number`;
    case "text": return `text of at most ${v.meta.max} characters`;
    default: return "a schema declared on its own";
  }
};
