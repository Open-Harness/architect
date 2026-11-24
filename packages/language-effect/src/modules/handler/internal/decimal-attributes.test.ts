// Exact decimals on a span (#742, item 5, after #943): a payload's and an answer's attributes are text, so a bigint reads
// as its digits (`attributes.ts`). A decimal is an Effect `BigDecimal` in code, and today it reaches the span as the
// object's JSON (`{"_id":"BigDecimal","value":"125","scale":2}`), which no reader of a trace takes for 1.25.
//
// Assumptions beyond those documents (the PR for this check lists them for the lead):
//  1. A traced decimal reads on a span exactly as it travels on the wire: the text the field's own schema encodes it to,
//     trailing zeros kept (`"1.50"`) and no exponent at any size. One text for one value, everywhere.
//  2. That holds for `payload.<field>` and `answer.<field>`, and inside a list's `items`, which reach the span as JSON
//     text: each decimal in them is that same text.
//  3. Visibility is unchanged: a secret decimal is still left off the span.
import { Blueprint } from "orthograph";
import { listItemFields, structOf } from "orthograph/server";
import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { answerAttributes, payloadAttributes } from "./attributes.ts";

const rate = Blueprint.decimal({ places: 20 });
const decimalOf = (text: string): unknown => Schema.decodeUnknownSync(rate.schema as never)(text);
const TEXTS = ["1.25", "1.50", "-0.5", "0", "10000000000000000", "0.00000000000000001", "123456789012345678901234567890.12"];

describe("Exact decimals: a decimal reads on a span as it travels", () => {
  it("writes a payload's decimal as its wire text", () => {
    for (const text of TEXTS) expect(payloadAttributes({ rate: decimalOf(text) }, { rate })["payload.rate"], text).toBe(text);
  });

  it("writes an answer's decimal as its wire text", () => {
    for (const text of TEXTS) expect(answerAttributes({ rate: decimalOf(text) }, { rate })["answer.rate"], text).toBe(text);
  });

  it("writes each decimal of a list's items as its wire text", () => {
    const Rate = Blueprint.thing({ description: "A rate.", fields: { id: Blueprint.id("rt"), value: rate } });
    const items = [{ id: "rt_1", state: "set", value: decimalOf("1.50") }, { id: "rt_2", state: "set", value: decimalOf("10000000000000000") }, { id: "rt_3", state: "set", value: decimalOf("-0.5") }];
    // Declared as a list read declares its items (`operations/service.ts`), so a build may encode each through its field's schema.
    const declared = { items: Blueprint.value(Schema.Array(structOf(listItemFields(Rate)))) };
    const shown = answerAttributes({ items }, declared, Rate.fields as never)["answer.items"];
    expect(shown).toBeTypeOf("string");
    expect((JSON.parse(shown as string) as ReadonlyArray<{ readonly value: unknown }>).map((i) => i.value)).toEqual(["1.50", "10000000000000000", "-0.5"]);
  });

  it("still leaves a secret decimal off the span", () => {
    const hidden = Blueprint.visibility.secret(rate);
    expect(payloadAttributes({ rate: decimalOf("1.25") }, { rate: hidden })).toEqual({});
    expect(answerAttributes({ rate: decimalOf("1.25") }, { rate: hidden })).toEqual({});
  });
});
