import { describe, expect, it } from "vitest";
import { Assets, placesOf } from "./service.ts";

describe("assets", () => {
  it("are frozen data: a token with its symbol and places, a currency with its code", () => {
    expect(Assets.asset.token({ symbol: "USDC", decimals: 6 })).toEqual({ kind: "asset", of: "token", symbol: "USDC", decimals: 6 });
    expect(Assets.asset.currency("EUR")).toEqual({ kind: "asset", of: "currency", code: "EUR" });
    expect(Object.isFrozen(Assets.asset.currency("EUR"))).toBe(true);
  });

  it("know the places of an ISO code, and nothing of any other word", () => {
    expect([placesOf("EUR"), placesOf("JPY"), placesOf("KWD")]).toEqual([2, 0, 3]);
    for (const wrong of ["EURO", "eur", "E", "XXZ", "constructor", "__proto__"]) expect(placesOf(wrong), wrong).toBeUndefined();
  });
});
