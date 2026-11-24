import { Schema } from "effect";
import type { FieldsInput } from "orthograph";
import { wireStruct } from "orthograph/server";
import { decimalPattern } from "./input.ts";

type Json = { readonly [key: string]: unknown };

/** What a tool's output schema is made from: the answer's fields, and whether the call is an operation (which may issue a secret). */
interface Answering {
  readonly answer: FieldsInput;
  readonly kind: string;
}

/** The fields an agent can ever be shown of an answer: a secret never leaves through MCP, not even one this call issued. */
const agentFields = (fields: FieldsInput): FieldsInput =>
  Object.fromEntries(Object.entries(fields).filter(([, f]) => f.visibility !== "secret"));

/** The field with a schema of its own choosing, keeping what the wire rule reads of it: its visibility and whether it is issued. */
const reschemed = (field: FieldsInput[string], schema: Schema.Top): FieldsInput[string] => {
  const value = field.kind === "field" ? field.value : field;
  return { kind: "value", schema, meta: value.meta, visibility: field.visibility, ...(field.issued === true ? { issued: true as const } : {}) } as unknown as FieldsInput[string];
};

/** A decimal as the text it travels as, with its input's pattern; an optional one stays an optional key. */
const decimalShown = (places: number, optional: boolean): Schema.Top => {
  const text = Schema.String.check(Schema.isPattern(new RegExp(decimalPattern(places), "u")));
  return optional ? (Schema.optionalKey(text) as unknown as Schema.Top) : text;
};

/**
 * A field's sentence and, for `state`, the machine's own states as the only values it can hold (M1.37, M1.42). A decimal is shown as
 * the text it travels as, with its input's pattern (#742): its own schema's sentence and pattern sit where JSON Schema doesn't show them.
 */
const told = (fields: FieldsInput, states: ReadonlyArray<string> | undefined): FieldsInput =>
  Object.fromEntries(Object.entries(fields).map(([key, field]) => {
    const value = field.kind === "field" ? field.value : field;
    const base =
      key === "state" && states !== undefined && states.length > 0 ? (Schema.Literals(states) as unknown as Schema.Top)
      : value.meta?.type === "decimal" ? decimalShown(value.meta.places, value.optional === true)
      : (value.schema as Schema.Top);
    const schema = field.description === undefined ? base : base.annotate({ description: field.description });
    return [key, schema === value.schema ? field : reschemed(field, schema)] as const;
  }));

/**
 * A tool's output schema: the JSON Schema of the answer as an agent is shown it (M1.37). A field every caller sees is required; a field
 * private to roles is optional, since the call cuts it for a caller without them; a secret is not named at all.
 * A `state` is one of the thing's states, as an enum. `undefined` for an answer with no fields.
 */
export const outputSchema = (op: Answering, items: FieldsInput = {}, states?: ReadonlyArray<string>): Json | undefined => {
  if (Object.keys(op.answer).length === 0) return undefined;
  const wire = wireStruct(told(agentFields(op.answer), states), {
    ...(Object.keys(items).length > 0 ? { items: told(agentFields(items), states) } : {}),
  });
  const { schema, definitions } = Schema.toJsonSchemaDocument(wire);
  // A refusal comes back as a tool error whose structured content is `{ refusal, code, exit, status, ...its fields }`, and a client checks
  // that against this schema too: so a result is one of two shapes, each with its own properties (an answer's own `status` is not the
  // refusal's), the answer first.
  const answer = { ...(schema as Json), type: "object" };
  const refusal = {
    type: "object",
    properties: { refusal: { type: "string" }, code: { type: "string" }, exit: { type: "integer" }, status: { type: "integer" } },
    required: ["refusal", "code", "exit", "status"],
  };
  return { type: "object", anyOf: [answer, refusal], ...(Object.keys(definitions).length > 0 ? { $defs: definitions } : {}) };
};
