import { Schema } from "effect";
import { describe, expect, expectTypeOf, it } from "vitest";
import { Values } from "./service.ts";

const decode = <S extends Schema.Constraint>(s: S, x: unknown) =>
  Schema.decodeUnknownExit(s as never)(x)._tag;

describe("values", () => {
  it("describe themselves for the model", () => {
    expect(Values.id("alw").meta).toEqual({ type: "id", prefix: "alw" });
    expect(Values.value(Values.uint(128)).meta).toEqual({ type: "uint", bits: 128 });
  });

  it("ids keep their prefix and brand", () => {
    const AllowanceId = Values.id("alw");
    expect(decode(AllowanceId.schema, "alw_7f3k")).toBe("Success");
    expect(decode(AllowanceId.schema, "org_7f3k")).toBe("Failure");
    const OrgId = Values.id("org");
    expectTypeOf<Schema.Schema.Type<typeof AllowanceId.schema>>().not.toEqualTypeOf<Schema.Schema.Type<typeof OrgId.schema>>();
  });

  it("uints are bounded bigints that travel as decimal strings", () => {
    const U8 = Values.uint(8);
    expect(decode(U8.schema, "255")).toBe("Success");
    expect(decode(U8.schema, "256")).toBe("Failure");
    expect(decode(U8.schema, "-1")).toBe("Failure");
    expect(decode(U8.schema, 255)).toBe("Failure");
    expect(Schema.encodeSync(Values.uint(128).schema)(2n ** 100n)).toBe("1267650600228229401496703205376");
  });

  it("whole numbers travel as base-unit digits only: no leading zero, no plus, no minus zero, no point, no exponent, no space", () => {
    const U8 = Values.uint(8);
    for (const bad of ["007", "-0", "+1", "1.5", "1e3", " 1", "1 ", "0x10"]) expect(decode(U8.schema, bad), bad).toBe("Failure");
    expect(decode(U8.schema, "0")).toBe("Success");
  });

  it("a width that is no whole number does not throw while the blueprint loads, and accepts nothing", () => {
    for (const bits of [Number.NaN, 1.5, Number.POSITIVE_INFINITY, 0, -8]) {
      expect(() => Values.uint(bits), String(bits)).not.toThrow();
      expect(decode(Values.uint(bits).schema, "0"), String(bits)).toBe("Failure");
      expect(() => Values.money({ kind: "asset", of: "currency", code: "EUR" }, { bits }), String(bits)).not.toThrow();
    }
  });

  it("an account is CAIP-10 text", () => {
    expect(Values.account().meta).toEqual({ type: "account" });
    expect(decode(Values.account().schema, "eip155:31337:0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266")).toBe("Success");
    expect(decode(Values.account().schema, "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266")).toBe("Failure");
  });

  it("money names its asset, is unsigned unless it says so, and keeps its range", () => {
    const usdc = { kind: "asset", of: "token", symbol: "USDC", decimals: 6 } as const;
    const price = Values.money(usdc);
    expect(price.meta).toEqual({ type: "money", bits: 128, signed: false, asset: { kind: "fixed", asset: usdc } });
    expect(decode(price.schema, "1250000")).toBe("Success");
    expect(decode(price.schema, "-1")).toBe("Failure");
    const fee = Values.money(usdc, { signed: true, bits: 8 });
    expect(decode(fee.schema, "-128")).toBe("Success");
    expect(decode(fee.schema, "-129")).toBe("Failure");
    expect(decode(fee.schema, "128")).toBe("Failure");
    const token = Values.account();
    expect(Values.money.of(token).meta).toEqual({ type: "money", bits: 128, signed: false, asset: { kind: "of", of: token } });
  });

  it("an email is text of at most 254 characters, and says it is an email", () => {
    expect(Values.email().meta).toEqual({ type: "text", max: 254 });
    expect(Values.email().format).toBe("email");
  });

  it("text is never empty", () => {
    expect(decode(Values.text().schema, "")).toBe("Failure");
    expect(decode(Values.text({ max: 3 }).schema, "abcd")).toBe("Failure");
  });

  it("described gives back a copy that carries the sentence, and leaves the original alone", () => {
    const Title = Values.text({ max: 10 });
    const Told = Values.described(Title, "What the link shows.");
    expect(Told.description).toBe("What the link shows.");
    expect(Title.description).toBeUndefined();
    expect(Told.schema).toBe(Title.schema);
    expect(Told.meta).toEqual(Title.meta);
  });
});
