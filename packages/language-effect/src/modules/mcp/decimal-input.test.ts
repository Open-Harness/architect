// Exact decimals on an agent's tool (#742, item 5, after #943): a tool's input schema says how a decimal travels, as it
// says it of a whole number (`input-pattern.test.ts`). Without a pattern an agent sees `{ type: "string" }` and may send
// `1e3`, `.5` or a rate with more places than the field holds, and learns only from the refusal.
//
// Assumptions beyond those documents (the PR for this check lists them for the lead):
//  1. A `Blueprint.decimal` payload field's property carries a `pattern`, a regular expression a JSON Schema reader
//     applies to the string, that takes the plain decimal text the value decodes and refuses what it refuses.
//  2. The pattern bounds the digits after the point by the field's `places`. Its exact spelling is the builder's: the
//     check runs it on texts, it does not compare it to a string.
//  3. `-0` is left out: the value refuses it, but a pattern that refuses it is long for little gain, so the check does
//     not ask for it.
import { Blueprint } from "orthograph";
import { structOf } from "orthograph/server";
import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { inputSchema } from "./internal/input.ts";

type Property = { readonly type?: string; readonly pattern?: string; readonly description?: string };
const propertyOf = (payload: Parameters<typeof structOf>[0], key: string): Property =>
  (inputSchema(structOf(payload), payload) as { readonly properties: Record<string, Property> }).properties[key] ?? {};
const patternOf = (p: Property): RegExp => {
  expect(p.pattern, "the decimal's property has a pattern").toBeTypeOf("string");
  return new RegExp(p.pattern!);
};

const GOOD = ["0", "7", "1.25", "-12.5", "1180", "-0.01", "123456789012345678901234567890.12"];
const BAD = ["", "1e3", "1E-2", "+1", ".5", "1.", "01", "-01.5", " 1", "1 ", "1,5", "0x10", "NaN", "Infinity", "-", "1.2.3"];

describe("Exact decimals: a tool's input schema says how a decimal travels", () => {
  it("takes plain decimal text and refuses exponents, signs, stray points, spaces and words", () => {
    const pattern = patternOf(propertyOf({ rate: Blueprint.decimal({ places: 2 }) }, "rate"));
    for (const good of GOOD) expect(pattern.test(good), good).toBe(true);
    for (const bad of BAD) expect(pattern.test(bad), JSON.stringify(bad)).toBe(false);
  });

  it("bounds the digits after the point by the field's places", () => {
    // Described, as a scaffolded field is (its label becomes its sentence): the pattern still comes from the decimal.
    const two = patternOf(propertyOf({ rate: Blueprint.described(Blueprint.decimal({ places: 2 }), "The rate.") }, "rate"));
    expect(two.test("1.23")).toBe(true);
    expect(two.test("1.234")).toBe(false);
    const none = patternOf(propertyOf({ count: Blueprint.decimal({ places: 0 }) }, "count"));
    expect(none.test("7")).toBe(true);
    expect(none.test("7.5")).toBe(false);
    const nine = patternOf(propertyOf({ share: Blueprint.decimal() }, "share"));
    expect(nine.test("0.123456789")).toBe(true);
    expect(nine.test("0.1234567891")).toBe(false);
  });

  it("agrees with the value: every text the pattern takes, the field decodes, and every one it refuses, the field refuses", () => {
    const twenty = "0.12345678901234567890";
    for (const places of [0, 2, undefined, 20]) {
      const rate = Blueprint.decimal(places === undefined ? undefined : { places });
      const pattern = patternOf(propertyOf({ rate }, "rate"));
      for (const text of [...GOOD, ...BAD, "-7", "7.5", "1.234", "1.50", "0.123456789", "0.1234567891", twenty, `${twenty}1`]) {
        expect(pattern.test(text), `${text} at ${String(places)} places`).toBe(Schema.decodeUnknownExit(rate.schema as never)(text)._tag === "Success");
      }
    }
  });

  it("keeps the field's type and its sentence, and gives text no pattern", () => {
    const payload = { rate: Blueprint.described(Blueprint.decimal({ places: 4 }), "The exchange rate."), memo: Blueprint.text({ max: 9 }) };
    const rate = propertyOf(payload, "rate");
    expect(rate.type).toBe("string");
    expect(rate.description).toBe("The exchange rate.");
    expect(propertyOf(payload, "memo").pattern).toBeUndefined();
  });

  it("says the pattern of a decimal taken from a thing's field", () => {
    const Rate = Blueprint.thing({ description: "A rate.", fields: { id: Blueprint.id("rt"), value: Blueprint.decimal({ places: 2 }) } });
    const pattern = patternOf(propertyOf({ value: Rate.fields.value }, "value"));
    expect(pattern.test("1.25")).toBe(true);
    expect(pattern.test("1.234")).toBe(false);
  });
});
