// A role's rule reads the world's rows through `factsRecords`, and it must read them as the server does
// (host-cloudflare's store `decodeRow`): D1 holds a boolean as 1 or 0, an optional field with no value as NULL, and a list
// as its JSON text. Found by Goal 16's leave checks (8b): a leave type's `Blueprint.bool()` killed the whole `prove` run.
import { Effect } from "effect";
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
  },
});

// What D1 hands back for one row, under each affinity it may use; `facts.record` passes it on untouched.
const facts = (row: Record<string, unknown>): Facts =>
  ({ record: (_table: string, id: string) => Effect.succeed(id === row["id"] ? row : null) }) as unknown as Facts;
const read = (row: Record<string, unknown>) =>
  Effect.runPromiseExit(
    Effect.gen(function* () { return yield* (yield* Records).find(Kind, row["id"] as never); })
      .pipe(Effect.provide(factsRecords(facts(row), () => "leave_type"))),
  );
const found = async (row: Record<string, unknown>) => {
  const exit = await read(row);
  if (exit._tag === "Failure") throw new Error(`the row did not decode: ${String(exit.cause)}`);
  return exit.value as Record<string, unknown>;
};
const base = { id: "lty_a1", name: "Annual", maxDays: "1", note: null, tags: "[]", state: "active", version: 1 };

describe("prove reads a world's rows as the server stores them", () => {
  it("control: a row already in its decoded shape still reads, keeping its state", async () => {
    const r = await found({ ...base, isLwp: true, note: "paid", tags: ["a"] });
    expect(r).toMatchObject({ id: "lty_a1", name: "Annual", isLwp: true, note: "paid", state: "active" });
  });
  it("a boolean held as 1 or 0 reads back as true or false", async () => {
    const r = await found({ ...base, isLwp: 1 });
    expect(r["isLwp"]).toBe(true);
    expect(String(r["maxDays"])).toBe("1"); // a whole number held as "1" is not a boolean
    expect((await found({ ...base, id: "lty_b2", isLwp: 0 }))["isLwp"]).toBe(false);
  });
  it("a boolean whose column read back as text, \"1\" or \"0\", reads back as true or false", async () => {
    expect((await found({ ...base, isLwp: "1" }))["isLwp"]).toBe(true);
    expect((await found({ ...base, id: "lty_b2", isLwp: "0" }))["isLwp"]).toBe(false);
  });
  it("an optional field that is NULL is left out, not read as a value", async () => {
    const r = await found({ ...base, isLwp: true, tags: ["a"] });
    expect("note" in r).toBe(false);
  });
  it("a list held as its JSON text reads back as the list", async () => {
    const r = await found({ ...base, name: "[draft] Annual", isLwp: true, note: "[x]", tags: '["carry","paid"]' });
    expect(r["tags"]).toEqual(["carry", "paid"]);
    expect([r["name"], r["note"]]).toEqual(["[draft] Annual", "[x]"]); // text that starts like JSON stays text
  });
  it("a value D1 cannot have made is still refused, not coerced", async () => {
    expect((await read({ ...base, isLwp: 2, note: "paid", tags: ["a"] }))._tag).toBe("Failure");
  });
});
