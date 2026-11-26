import { Schema } from "effect";
import type { FieldsInput } from "orthograph";

type Json = { readonly [key: string]: unknown };

const UNSIGNED = "^(0|[1-9][0-9]*)$";
const SIGNED = "^(0|-?[1-9][0-9]*)$";
/** A decimal's text as its value takes it (`values/internal/wire.ts`): no exponent, no `+`, no leading zero, no `-0`, at most `places` after the point. */
export const decimalPattern = (places: number): string => `^(?!-0(\\.0*)?$)-?(0|[1-9][0-9]*)${places > 0 ? `(\\.[0-9]{1,${places}})?` : ""}$`;

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
      const input = payload[k];
      const meta = input === undefined ? undefined : (input.kind === "field" ? input.value : input).meta;
      // A whole number travels as base-unit digits only (M6-money (c)); the pattern is on the string, which the generated schema does not carry, so it is said here.
      const digits =
        meta?.type === "uint" ? UNSIGNED
        : meta?.type === "money" ? (meta.signed ? SIGNED : UNSIGNED)
        : meta?.type === "decimal" ? decimalPattern(meta.places)
        : undefined;
      const said = digits === undefined ? p : { ...(p as Json), pattern: digits };
      return [k, description === undefined ? said : { ...(said as Json), description }] as const;
    })),
    required: (full.required ?? []).filter((k) => !hidden.has(k)),
    additionalProperties: false,
    ...(Object.keys(definitions).length > 0 ? { $defs: definitions } : {}),
  };
};
