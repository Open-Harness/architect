import { Schema } from "effect";
import type { FieldInput, FieldsInput } from "orthograph";
import type { Audience } from "../types.ts";
import { presence } from "./rule.ts";

const schemaOf = (field: FieldInput): Schema.Top => (field.kind === "field" ? field.value.schema : field.schema) as Schema.Top;

/** The struct of the fields `audience` can be answered with. */
export const schemaFor = (audience: Audience, fields: FieldsInput, items: FieldsInput | undefined): Schema.Top =>
  Schema.Struct(Object.fromEntries(Object.entries(fields).flatMap(([key, field]) => {
    const shown = presence(audience, field);
    if (shown === "absent") return [];
    // A list's items are whole instances: each one is cut the same way, by the thing's own fields.
    const schema = key === "items" && items !== undefined ? Schema.Array(schemaFor(audience, items, undefined)) : schemaOf(field);
    return [[key, shown === "optional" ? Schema.optionalKey(schema) : schema] as const];
  })));
