// G5 section 6.2: a clash among the call's own rows is the handler's bug, found before any look at the store's holders: two inserts of one name are `own`
// even when a committed instance holds the name too. A call that moves the holder out of the name and takes it over is no clash (it follows `orderSteps`).
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { Blueprint } from "orthograph";
import { storeMemory, Unit } from "./service.ts";
import { Store } from "./types.ts";

const B = Blueprint as any;
const Handle = Blueprint.thing({
  description: "A name someone holds.",
  code: "HD",
  fields: { id: Blueprint.id("hdl"), name: Blueprint.text({ max: 40 }) },
});
const oneHolderPerName = B.invariant.unique(Handle.fields.name);
const rules = [{ name: "handle.oneHolderPerName", rule: oneHolderPerName }];

const checked = (initial: ReadonlyArray<readonly [any, any]>, given: ReadonlyArray<any>, f: (unit: any) => Effect.Effect<void, any, any>) =>
  Effect.runPromise(Effect.flatMap(Store, (store) => Effect.gen(function* () {
    const unit: any = yield* Unit.make(store, given);
    yield* f(unit);
    return yield* unit.check;
  })).pipe(Effect.provide(storeMemory(initial as any, given).layer)) as Effect.Effect<any>);

describe("unit.check and the call's own rows (G5 6.2)", () => {
  it("two inserts of one name are the handler's own clash, though a committed holder has the name too", async () => {
    const v = await checked([[Handle, { id: "hdl_0", name: "same" }]], rules, (unit) => Effect.gen(function* () {
      yield* unit.records.insert(Handle, { id: "hdl_1", name: "same" });
      yield* unit.records.insert(Handle, { id: "hdl_2", name: "same" });
    }));
    expect(v).toMatchObject({ rule: "handle.oneHolderPerName", own: true });
  });

  it("one insert of a held name is another's, so a refusal and not own", async () => {
    const v = await checked([[Handle, { id: "hdl_0", name: "same" }]], rules, (unit) => unit.records.insert(Handle, { id: "hdl_1", name: "same" }));
    expect(v).toMatchObject({ rule: "handle.oneHolderPerName", own: false });
  });

  it("updating the holder away and claiming its name breaks nothing", async () => {
    const v = await checked([[Handle, { id: "hdl_0", name: "same" }]], rules, (unit) => Effect.gen(function* () {
      yield* unit.records.update(Handle, "hdl_0", { name: "other" });
      yield* unit.records.insert(Handle, { id: "hdl_1", name: "same" });
    }));
    expect(v).toBeUndefined();
  });
  it("two different things that each keep a rule on a field of one name, with one value, are no clash", async () => {
    const Cup = Blueprint.thing({ description: "A cup.", code: "CU", fields: { id: Blueprint.id("cup"), name: Blueprint.text({ max: 40 }) } });
    const Mug = Blueprint.thing({ description: "A mug.", code: "MG", fields: { id: Blueprint.id("mug"), name: Blueprint.text({ max: 40 }) } });
    const both = [{ name: "cup.onePerName", rule: B.invariant.unique(Cup.fields.name) }, { name: "mug.onePerName", rule: B.invariant.unique(Mug.fields.name) }];
    const v = await checked([], both, (unit) => Effect.gen(function* () {
      yield* unit.records.insert(Cup, { id: "cup_1", name: "same" });
      yield* unit.records.insert(Mug, { id: "mug_1", name: "same" });
    }));
    expect(v).toBeUndefined();
  });
});
