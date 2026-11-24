// Exact decimals in an agent's tool result (#742, item 5, after #954 and #959): a tool's output schema says what an answer
// holds, and an MCP client checks a result against it. A decimal answer field is `{ type: "string" }` today, while its
// input property already carries the decimal's pattern (`decimal-input.test.ts`), so an agent learns what it may send but
// not what it is shown.
//
// Assumptions beyond those documents (the PR for this check lists them for the lead):
//  1. A `Blueprint.decimal` answer field's property in the output schema carries the same `pattern` its input property
//     does: the text of the decimal, its places bounded. The check runs the pattern on texts and compares it with the
//     input's; it does not spell it.
//  2. That holds for a list read's `items` too, and for a decimal taken from a thing's field. A described decimal keeps
//     its sentence, as a described text field already does (today the decimal's is lost).
import { Blueprint } from "orthograph";
import { listItemFields, structOf } from "orthograph/server";
import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { inputSchema } from "./internal/input.ts";
import { outputSchema } from "./internal/output.ts";

type Property = { readonly type?: string; readonly pattern?: string; readonly description?: string };
type Answer = { readonly properties: Record<string, Property & { readonly items?: { readonly properties?: Record<string, Property>; readonly $ref?: string } }> };
const answerOf = (schema: unknown): Answer => (schema as { readonly anyOf: ReadonlyArray<Answer> }).anyOf[0]!;
/** The properties of one item of a list read's `items`, inline or behind a `$ref` into `$defs`. */
const itemPropertiesOf = (schema: unknown): Record<string, Property> => {
  const list = answerOf(schema).properties["items"]?.items ?? {};
  const item = list.$ref === undefined ? list : (schema as { readonly $defs?: Record<string, { readonly properties?: Record<string, Property> }> }).$defs?.[list.$ref.split("/").pop()!];
  return item?.properties ?? {};
};
const inputPattern = (field: Parameters<typeof structOf>[0][string]): string | undefined =>
  (inputSchema(structOf({ f: field }), { f: field }) as { readonly properties: Record<string, Property> }).properties["f"]?.pattern;

describe("Exact decimals: a tool's output schema says how a decimal is shown", () => {
  it("gives a decimal answer field the decimal's pattern, the same as its input's", () => {
    const rate = Blueprint.decimal({ places: 2 });
    const schema = outputSchema({ answer: { rate, name: Blueprint.text() }, kind: "operation" });
    const property = answerOf(schema).properties["rate"]!;
    // Only the decimal: a text field beside it, and the refusal's own shape, keep theirs.
    expect(answerOf(schema).properties["name"]?.pattern).toBeUndefined();
    expect(JSON.stringify((schema as { readonly anyOf: ReadonlyArray<unknown> }).anyOf[1])).not.toContain("pattern");
    expect(property.pattern, "the decimal's property has a pattern").toBeTypeOf("string");
    expect(property.pattern).toBe(inputPattern(rate));
    const pattern = new RegExp(property.pattern!);
    expect(pattern.test("1.25")).toBe(true);
    expect(pattern.test("1.234")).toBe(false);
    expect(pattern.test("1e3")).toBe(false);
  });

  it("keeps the type and sentence of a decimal taken from a thing's field", () => {
    const Rate = Blueprint.thing({ description: "A rate.", fields: { id: Blueprint.id("rt"), value: Blueprint.described(Blueprint.decimal({ places: 4 }), "The rate.") } });
    const property = answerOf(outputSchema({ answer: { value: Rate.fields.value }, kind: "read" })).properties["value"]!;
    expect(property.type).toBe("string");
    expect(property.description).toBe("The rate.");
    expect(property.pattern).toBe(inputPattern(Rate.fields.value));
  });

  it("gives each decimal in a list read's items its pattern and sentence, and no other item field a decimal's pattern", () => {
    const Rate = Blueprint.thing({ description: "A rate.", fields: { id: Blueprint.id("rt"), name: Blueprint.text(), value: Blueprint.described(Blueprint.decimal({ places: 4 }), "The rate.") } });
    // Declared as a list read declares its answer (`operations/service.ts`), with the items' fields handed over as the MCP door hands them.
    const items = listItemFields(Rate);
    const schema = outputSchema({ answer: { items: Blueprint.value(Schema.Array(structOf(items))) }, kind: "read" }, items) as Record<string, unknown>;
    const item = itemPropertiesOf(schema);
    expect(item["value"]?.pattern).toBe(inputPattern(Rate.fields.value));
    expect(item["value"]?.description).toBe("The rate.");
    for (const other of ["id", "name", "state"]) expect(item[other]?.pattern, other).toBeUndefined();
    expect(answerOf(schema).properties["items"]?.pattern).toBeUndefined();
  });
});
