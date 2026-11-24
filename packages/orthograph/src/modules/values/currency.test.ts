// Company currency, part one (#882; design/decisions/CX-currency.md): a currency is a value a row can hold, and an amount
// may count the currency its own row holds. ERPNext keeps a currency on the row (Sales Invoice's `currency`, GL Entry's
// `account_currency`, a Company's `default_currency`), so an amount's asset is the row's field, as `money.of(token)` is
// for a token today (M6-money item 2). Exchange rates are part two: a rate is an exact decimal (#742, item 5).
//
// Assumptions beyond those documents (the PR for this check lists them for the lead):
//  1. `Blueprint.currency()` is a value: an ISO 4217 code, three capital letters that `placesOf` knows (the same table the
//     compiler checks `Blueprint.asset.currency` against), and its meta is `{ type: "currency" }`, its own kind.
//  2. `Blueprint.money.of(currency)` takes a currency field as it takes an account() field; its meta is unchanged.
//
// `Blueprint.currency` is read loosely so this file type-checks before and after the surface exists.
import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { Blueprint } from "../../index.ts";
import type { Value } from "./types.ts";

const currency = (): Value => {
  const surface = Blueprint as unknown as { readonly currency?: () => Value };
  if (typeof surface.currency !== "function") throw new Error("Blueprint.currency is not there: Company currency (#882) adds it");
  return surface.currency();
};
const decode = (x: unknown) => Schema.decodeUnknownExit(currency().schema as never)(x)._tag;

describe("Company currency: a currency is a value", () => {
  it("describes itself for the model as a currency, public, and keeps that when named", () => {
    expect(currency().meta).toEqual({ type: "currency" });
    expect(currency().visibility).toBe("public");
    expect(Blueprint.value(currency()).meta).toEqual({ type: "currency" });
  });

  it("holds an ISO 4217 code, whatever its places: two, none or three", () => {
    for (const good of ["KES", "USD", "EUR", "JPY", "BHD"]) expect(decode(good), good).toBe("Success");
  });

  it("refuses a code ISO 4217 lacks, a lower-case or short code, empty text and a number", () => {
    for (const bad of ["ZZZ", "QQQ", "kes", "Usd", "US", "USDC", " USD", ""]) expect(decode(bad), JSON.stringify(bad)).toBe("Failure");
    expect(decode(840)).toBe("Failure");
  });

  it("travels on the wire exactly as written", () => {
    expect(Schema.encodeSync(currency().schema as never)("KES" as never)).toBe("KES");
  });

  it("is what an amount of the row's own currency counts", () => {
    const held = currency();
    expect(Blueprint.money.of(held).meta).toEqual({ type: "money", bits: 128, signed: false, asset: { kind: "of", of: held } });
    expect(Blueprint.money.of(held, { signed: true }).meta).toEqual({ type: "money", bits: 128, signed: true, asset: { kind: "of", of: held } });
  });
});
