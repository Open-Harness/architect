// A role's rule reads the world's rows through `factsRecords`, and it must read them as the server does
// (host-cloudflare's store `decodeRow`): what a field's schema encodes to decides how its column holds it. A boolean is held
// as 1 or 0, a list, struct or unknown as its JSON text, and an optional field with no value as NULL; plain text stays text.
// Found by Goal 16's leave checks (8b): a leave type's `Blueprint.bool()` killed the whole `prove` run.
import { Effect, Schema } from "effect";
import { Blueprint } from "orthograph";
import { describe, expect, it } from "vitest";
import { Records } from "@orthograph/language-effect";
import type { Facts } from "./types.ts";
import { factsRecords } from "./internal/world.ts";

const Kind = Blueprint.thing({
  description: "A kind of leave, with each column shape D1 changes.",
  fields: {
    id: Blueprint.id("lty"),
    name: Blueprint.text(),
    isLwp: Blueprint.bool(),
    maxDays: Blueprint.uint(16),
    note: Blueprint.optional(Blueprint.text()),
    tags: Blueprint.list(Blueprint.text()),
    paid: Blueprint.value(Schema.NullOr(Schema.Boolean)),
    memo: Blueprint.value(Schema.NullOr(Schema.String)),
    source: Blueprint.refAny(),
    extra: Blueprint.value(Schema.Unknown),
    loose: Blueprint.value(Schema.Any),
    kind: Blueprint.oneOf(["annual", "sick"]),
    days: Blueprint.value(Schema.NullOr(Schema.Array(Schema.String))),
  },
});

// One row whose columns are already in their decoded shape (a whole number is held as its text, as it is encoded);
// each test changes only the columns it is about.
const stored = {
  id: "lty_a1", name: "Annual", isLwp: true, maxDays: "1", note: "paid", tags: ["a"], paid: false, memo: "kept",
  source: { declaration: "company", id: "com_a1" }, extra: { level: 2 }, loose: { a: 1 }, kind: "annual", days: ["mon"],
};
const row = (over: Record<string, unknown>) => ({ ...stored, ...over, state: "active", version: 3 });

// What D1 hands back for one row, under each affinity it may use; `facts.record` passes it on untouched.
const facts = (r: Record<string, unknown>): Facts =>
  ({ record: (_table: string, id: string) => Effect.succeed(id === r["id"] ? r : null) }) as unknown as Facts;
const read = (r: Record<string, unknown>) =>
  Effect.runPromiseExit(
    Effect.gen(function* () { return yield* (yield* Records).find(Kind, r["id"] as never); })
      .pipe(Effect.provide(factsRecords(facts(r), () => "leave_type"))),
  );
const found = async (r: Record<string, unknown>) => {
  const exit = await read(r);
  if (exit._tag === "Failure") throw new Error(`the row did not decode: ${String(exit.cause)}`);
  return exit.value as Record<string, unknown>;
};

describe("prove reads a world's rows as the server stores them", () => {
  it("control: a row already in its decoded shape reads as exactly its fields and its state", async () => {
    expect(await found(row({}))).toEqual({ ...stored, maxDays: 1n, state: "active" });
  });
  it("a boolean held as 1 or 0 reads back as true or false", async () => {
    const r = await found(row({ isLwp: 1 }));
    expect(r["isLwp"]).toBe(true);
    expect(r["maxDays"]).toBe(1n); // a whole number held as "1" is not a boolean
    expect((await found(row({ isLwp: 0 })))["isLwp"]).toBe(false);
  });
  it("a boolean whose column read back as text, \"1\" or \"0\", reads back as true or false", async () => {
    expect((await found(row({ isLwp: "1" })))["isLwp"]).toBe(true);
    expect((await found(row({ isLwp: "0" })))["isLwp"]).toBe(false);
  });
  it("a nullable boolean held as 1 reads back as true, and as NULL reads back as null", async () => {
    expect((await found(row({ paid: 1 })))["paid"]).toBe(true);
    const r = await found(row({ paid: null }));
    expect("paid" in r && r["paid"] === null).toBe(true);
  });
  it("an optional field that is NULL is left out, not read as a value", async () => {
    expect("note" in (await found(row({ note: null })))).toBe(false);
  });
  it("control: a nullable field that is NULL is kept as null, not left out", async () => {
    const r = await found(row({ memo: null }));
    expect("memo" in r && r["memo"] === null).toBe(true);
  });
  it("a list held as its JSON text reads back as the list", async () => {
    expect((await found(row({ tags: '["carry","paid"]' })))["tags"]).toEqual(["carry", "paid"]);
  });
  it("a reference to any thing held as its JSON text reads back as the reference", async () => {
    expect((await found(row({ source: '{"declaration":"branch","id":"brn_b2"}' })))["source"]).toEqual({ declaration: "branch", id: "brn_b2" });
  });
  it("an unknown value held as its JSON text reads back as the value", async () => {
    expect((await found(row({ extra: '{"level":5}' })))["extra"]).toEqual({ level: 5 });
    expect((await found(row({ extra: '"hello"' })))["extra"]).toBe("hello");
    expect((await found(row({ extra: "5" })))["extra"]).toBe(5);
    expect((await found(row({ loose: '{"a":2}' })))["loose"]).toEqual({ a: 2 }); // an any field is held the same way
  });
  it("a nullable list held as its JSON text reads back as the list, and as NULL reads back as null", async () => {
    expect((await found(row({ days: '["mon","tue"]' })))["days"]).toEqual(["mon", "tue"]);
    const r = await found(row({ days: null }));
    expect("days" in r && r["days"] === null).toBe(true);
  });
  it("control: text that is itself valid JSON stays text", async () => {
    const r = await found(row({ name: '["draft"]', note: '{"x":1}', memo: "1" }));
    expect([r["name"], r["note"], r["memo"]]).toEqual(['["draft"]', '{"x":1}', "1"]);
    expect((await found(row({ kind: "sick" })))["kind"]).toBe("sick"); // a choice is text too
  });
  it("control: a value D1 cannot have made is refused, not coerced", async () => {
    expect((await read(row({ isLwp: 2 })))._tag).toBe("Failure");
    expect((await read(row({ isLwp: "true" })))._tag).toBe("Failure");
    expect((await read(row({ name: null })))._tag).toBe("Failure");
  });
});
