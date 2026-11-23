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

  it("an instant is a real moment in its canonical spelling", () => {
    const Instant = Values.instant();
    expect(Instant.meta).toEqual({ type: "instant" });
    expect(decode(Instant.schema, "2027-01-10T09:00:00.000Z")).toBe("Success");
    expect(decode(Instant.schema, "2028-02-29T23:59:59.999Z")).toBe("Success");
    for (const bad of ["2027-02-30T09:00:00.000Z", "2027-99-99T99:99:99.000Z", "2027-02-29T09:00:00.000Z", "2027-01-10T24:00:00.000Z", "2027-01-10T09:00:00Z", "2027-01-10"]) {
      expect(decode(Instant.schema, bad), bad).toBe("Failure");
    }
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

  it("a list of structs says the names of its rows' fields, so the model shows what each row holds", () => {
    const Row = Values.value(Schema.Struct({ revision: Schema.Number, at: Schema.Number }));
    expect(Values.list(Row).meta).toEqual({ type: "schema", format: "list", fields: ["revision", "at"] });
    expect(Values.list(Values.text()).meta).toEqual({ type: "schema", format: "list" });
  });
});
