// Exact decimals (#742, item 5): ERPNext's Float and Percent (rates, quantities, percentages, exchange rates) are exact
// decimals, never binary floats. The ERPNext spike wrote one as a raw schema (`spikes/erpnext-doctypes/scaffold.mjs`,
// `Decimal`, a pattern on text), so a handler could do no arithmetic on it and nothing bounded its places.
//
// Assumptions beyond those documents (the PR for this check lists them for the lead):
//  1. `Blueprint.decimal(options?)` is a value. In code it is Effect's `BigDecimal`, so a handler adds and multiplies
//     exactly; on the wire it is decimal text, as money is digits, since a JSON number is a binary float.
//  2. `places` is the most digits it holds after the point, 9 when unset (ERPNext's largest float precision). Its meta
//     is `{ type: "decimal", places }`, its own kind: clients parse it as a decimal, not as text.
//  3. The wire is plain decimal text: an optional `-`, digits with no leading zero, and an optional point with at least
//     one digit after it. No exponent, no `+`, no `-0`, no spaces, no thousands separator. Trailing zeros are allowed
//     (`"1.50"`, as ERPNext writes them) and count as places. It may be negative: a return's quantity is.
//  4. Encoding writes the same text a canonical input was decoded from, with no exponent, so a value round-trips exactly.
//
// `Blueprint.decimal` is read loosely so this file type-checks before and after the surface exists.
import { BigDecimal, Schema } from "effect";
import { describe, expect, it } from "vitest";
import { Blueprint } from "../../index.ts";
import type { Value } from "./types.ts";

const decimal = (options?: { readonly places?: number }): Value => {
  const surface = Blueprint as unknown as { readonly decimal?: (options?: { readonly places?: number }) => Value };
  if (typeof surface.decimal !== "function") throw new Error("Blueprint.decimal is not there: #742 item 5 adds it");
  return surface.decimal(options);
};
const decode = (v: Value, x: unknown) => Schema.decodeUnknownExit(v.schema as never)(x);
const holds = (v: Value, x: unknown) => decode(v, x)._tag;
const roundTrip = (v: Value, text: string): unknown => {
  const exit = decode(v, text);
  if (exit._tag !== "Success") throw new Error(`${text} did not decode`);
  return Schema.encodeUnknownSync(v.schema as never)(exit.value);
};

describe("Exact decimals: a decimal is a value", () => {
  it("describes itself for the model as a decimal with its places, 9 when unset, and keeps that when named", () => {
    expect(decimal().meta).toEqual({ type: "decimal", places: 9 });
    expect(decimal({ places: 4 }).meta).toEqual({ type: "decimal", places: 4 });
    expect(decimal().visibility).toBe("public");
    expect(Blueprint.value(decimal({ places: 2 })).meta).toEqual({ type: "decimal", places: 2 });
  });

  it("is an exact BigDecimal in code, so 0.1 is 1/10 and not a binary float", () => {
    const exit = decode(decimal(), "0.1");
    expect(exit._tag).toBe("Success");
    const value = exit._tag === "Success" ? exit.value : undefined;
    expect(BigDecimal.isBigDecimal(value)).toBe(true);
    expect(BigDecimal.equals(value as unknown as BigDecimal.BigDecimal, BigDecimal.fromStringUnsafe("0.1"))).toBe(true);
  });

  it("round-trips decimal text exactly, past what a float can hold, negatives included", () => {
    const v = decimal();
    for (const text of ["0", "0.1", "-12.5", "1180", "1.25", "123456789012345678901234567890.123456789", "-0.000000001", "9007199254740993"]) {
      expect(roundTrip(v, text), text).toBe(text);
    }
  });

  it("holds trailing zeros as written by ERPNext, as the same number", () => {
    const exit = decode(decimal({ places: 2 }), "1.50");
    expect(exit._tag).toBe("Success");
    expect(BigDecimal.equals((exit as { readonly value: BigDecimal.BigDecimal }).value, BigDecimal.fromStringUnsafe("1.5"))).toBe(true);
  });

  it("holds up to its places after the point and refuses one more", () => {
    expect(holds(decimal({ places: 2 }), "1.23")).toBe("Success");
    expect(holds(decimal({ places: 2 }), "1.234")).toBe("Failure");
    expect(holds(decimal({ places: 0 }), "7")).toBe("Success");
    expect(holds(decimal({ places: 0 }), "7.5")).toBe("Failure");
    expect(holds(decimal(), "0.123456789")).toBe("Success");
    expect(holds(decimal(), "0.1234567891")).toBe("Failure");
  });

  it("refuses a JSON number, since a number on the wire is already a binary float", () => {
    for (const bad of [0.1, 12, -1.5]) expect(holds(decimal(), bad), String(bad)).toBe("Failure");
  });

  it("refuses text that is no plain decimal: exponents, signs, stray points, spaces, separators and words", () => {
    for (const bad of ["", "1e3", "1E-2", "+1", "-0", "-0.0", ".5", "1.", "01", "-01.5", " 1", "1 ", "1,5", "1_000", "0x10", "NaN", "Infinity", "-", "1.2.3"]) {
      expect(holds(decimal(), bad), JSON.stringify(bad)).toBe("Failure");
    }
  });
});
