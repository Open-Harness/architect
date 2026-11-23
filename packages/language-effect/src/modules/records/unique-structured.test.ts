// G5 (respelled from G4 at ST1.20): a unique rule's key is compared by its encoded form, so a struct or array field holds by what it contains, not as `[object Object]`.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Effect, Schema } from "effect";
import { describe, expect, it } from "vitest";
import { Blueprint } from "orthograph";
import { storeMemory, Unit } from "./service.ts";
import { Store } from "./types.ts";

const Slot = Blueprint.thing({
  description: "A place someone holds.",
  fields: { id: Blueprint.id("slt"), spot: Blueprint.value(Schema.Struct({ row: Schema.Number, seat: Schema.String })) },
});
const onePerSpot = (Blueprint as any).invariant.unique(Slot.fields.spot);
const rules = [{ name: "slot.onePerSpot", rule: onePerSpot }];
const a = { row: 1, seat: "a" };
const b = { row: 2, seat: "b" };

describe("unique over a structured field (G5)", () => {
  it("findBy(rule, value) matches the equal struct and not another; the store refuses only a real duplicate", async () => {
    const memory = storeMemory([[Slot, { id: "slt_1", spot: a }]] as never, rules);
    const result = await Effect.runPromise(Effect.gen(function* () {
      const store = yield* Store;
      const unit = yield* Unit.make(store, rules);
      const same = yield* unit.records.findBy(onePerSpot, { ...a });
      const other = yield* unit.records.findBy(onePerSpot, b);
      yield* unit.records.insert(Slot, { id: "slt_2" as never, spot: b });
      const distinct = yield* store.commit({ writes: yield* unit.writes, entries: [] });
      const dup = yield* Unit.make(store, rules);
      yield* dup.records.insert(Slot, { id: "slt_3" as never, spot: { ...b } });
      return { same, other, distinct, duplicate: yield* store.commit({ writes: yield* dup.writes, entries: [] }) };
    }).pipe(Effect.provide(memory.layer)));
    expect(result.same).toMatchObject({ id: "slt_1" });
    expect(result.other).toBeUndefined();
    expect([result.distinct, result.duplicate]).toEqual(["committed", "conflict"]);
  });
});
