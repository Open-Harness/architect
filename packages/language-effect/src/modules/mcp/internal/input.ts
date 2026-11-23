import { Schema } from "effect";
import type { FieldsInput } from "orthograph";

type Json = { readonly [key: string]: unknown };

/** A payload field the caller may not give: declared, and not public. A tool never offers it and never takes it. */
export const hiddenInputs = (payload: FieldsInput): ReadonlyArray<string> =>
  Object.keys(payload).filter((k) => payload[k]!.visibility !== "public");

/**
 * A tool's input schema: the JSON Schema of the operation's payload, as it travels (bigints as digit strings), with the
 * fields that are not public taken out. Excess properties are refused, so a secret can't be sent by naming it anyway.
 */
export const inputSchema = (payloadSchema: Schema.Top, payload: FieldsInput): Json => {
  const { schema, definitions } = Schema.toJsonSchemaDocument(payloadSchema);
  const full = schema as { readonly properties?: Json; readonly required?: ReadonlyArray<string> };
  const hidden = new Set(hiddenInputs(payload));
  return {
    type: "object",
    // Each property says what its field is for, in the blueprint's own words (M1.42).
    properties: Object.fromEntries(Object.entries(full.properties ?? {}).filter(([k]) => !hidden.has(k)).map(([k, p]) => {
      const description = payload[k]?.description;
      return [k, description === undefined ? p : { ...(p as Json), description }] as const;
    })),
    required: (full.required ?? []).filter((k) => !hidden.has(k)),
    additionalProperties: false,
    ...(Object.keys(definitions).length > 0 ? { $defs: definitions } : {}),
  };
};
