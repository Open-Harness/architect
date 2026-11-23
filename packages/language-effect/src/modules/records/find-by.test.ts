// G5 (ST1.13), the handler's half: `Records.findBy(rule, value)` returns the one instance holding `value` under a unique invariant within the rule's scope, or
// undefined; it sees this call's own writes first; it takes an object for a composite key; it type-checks only for a rule and the key's own type; and the store
// refuses, at commit, a second holder (a `conflict`, so the call runs again and its `findBy` then sees the first). Replaces G4's `findBy(thing, field, value)`
// test. Written by the checks author; the builder never edits this file or test/fixtures/find-by-types/.
//
// SURFACE PINNED HERE (G5 sections 4 and 5; asked of the author if a builder needs it changed): the rules a store and a unit enforce are handed in as a list of
// `{ name, rule }` (the model's full name, which a defect quotes), `storeMemory(initial, rules)` and `Unit.make(store, rules)`; the host derives that list from the
// model's invariants. The store here is `storeMemory`, the in-memory double a host's store must agree with (same versions, same all-or-nothing commit); the real
// D1 store's half is `packages/host-cloudflare/src/modules/store/unique.test.ts`.
//
// The rules are built when a test asks, not when the file loads: before ST1.14 `Blueprint.invariant` does not exist, and the control must still run.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { Effect, Schema } from "effect";
import { describe, expect, it } from "vitest";
import { Blueprint } from "orthograph";
import { storeMemory as storeMemoryNow, Unit as UnitNow } from "./service.ts";
import { Store } from "./types.ts";

// The surface this file pins is not in the types yet; these casts keep the file compiling today so it can run, and fail, as a test.
const B = Blueprint as any;
const storeMemory = storeMemoryNow as unknown as (initial?: ReadonlyArray<readonly [any, any]>, rules?: ReadonlyArray<any>) => ReturnType<typeof storeMemoryNow>;
const Unit = UnitNow as unknown as { readonly make: (store: any, rules?: ReadonlyArray<any>) => Effect.Effect<any, never, never> };

const Handle = Blueprint.thing({
  description: "A name someone holds.",
  code: "HD",
  fields: { id: Blueprint.id("hdl"), name: Blueprint.text({ max: 40 }), owner: Blueprint.text({ max: 40 }), note: Blueprint.text({ max: 40 }) },
});
let built: { oneHolderPerName: any; oneNamePerPerson: any; rules: any[] } | undefined;
const world = () => (built ??= (() => {
  const machine = Blueprint.machine(Handle, {
    states: ["claimed", "released"],
    moves: { claim: { from: [], to: "claimed", emits: Blueprint.event({}) }, release: { from: ["claimed"], to: "released", emits: Blueprint.event({}) } },
    notFrom: { exit: 60 },
  });
  const oneHolderPerName = B.invariant.unique(Handle.fields.name, { while: [(machine as any).states.claimed] });
  const oneNamePerPerson = B.invariant.unique([Handle.fields.owner, Handle.fields.name]);
  return { oneHolderPerName, oneNamePerPerson, rules: [{ name: "handle.oneHolderPerName", rule: oneHolderPerName }, { name: "handle.oneNamePerPerson", rule: oneNamePerPerson }] };
})());
const ada = { id: "hdl_1", name: "ada", owner: "o1", note: "first" };

const withStore = <A,>(initial: Parameters<typeof storeMemory>[0], f: (store: Store["Service"]) => Effect.Effect<A, any, any>, useRules = true) => {
  const memory = storeMemory(initial, useRules ? world().rules : []);
  return Effect.runPromise(Effect.flatMap(Store, f).pipe(Effect.provide(memory.layer)) as Effect.Effect<A>).then((a) => ({ a, memory }));
};

describe("G5 control: what a handler reads today", () => {
  it("finds an instance by id, whatever rules the store holds", async () => {
    const { a } = await withStore([[Handle, { ...ada, state: "claimed" }]], (store) =>
      Effect.gen(function* () {
        const unit = yield* Unit.make(store);
        return yield* unit.records.find(Handle, "hdl_1");
      }), false);
    expect(a).toMatchObject({ id: "hdl_1", name: "ada", state: "claimed" });
  });
});

describe("Records.findBy(rule, value) (G5)", () => {
  it("returns the instance holding the value within the rule's scope, and undefined otherwise", async () => {
    const { a } = await withStore([
      [Handle, { ...ada, state: "claimed" }],
      [Handle, { id: "hdl_2", name: "grace", owner: "o2", note: "x", state: "released" }],
    ], (store) =>
      Effect.gen(function* () {
        const records = (yield* Unit.make(store, world().rules)).records;
        return {
          held: yield* records.findBy(world().oneHolderPerName, "ada"),
          free: yield* records.findBy(world().oneHolderPerName, "nobody"),
          // grace is released: out of the scope "while claimed", so no one holds the name
          outOfScope: yield* records.findBy(world().oneHolderPerName, "grace"),
        };
      }));
    expect(a.held).toMatchObject({ id: "hdl_1", name: "ada", state: "claimed" });
    expect(a.free).toBeUndefined();
    expect(a.outOfScope).toBeUndefined();
  });

  it("a composite key takes an object of its fields, and a rule with no `while` holds in every state", async () => {
    const { a } = await withStore([[Handle, { ...ada, state: "released" }]], (store) =>
      Effect.gen(function* () {
        const records = (yield* Unit.make(store, world().rules)).records;
        return {
          both: yield* records.findBy(world().oneNamePerPerson, { owner: "o1", name: "ada" }),
          onlyOne: yield* records.findBy(world().oneNamePerPerson, { owner: "o1", name: "grace" }),
        };
      }));
    expect(a.both).toMatchObject({ id: "hdl_1" });
    expect(a.onlyOne).toBeUndefined();
  });

  it("sees this call's own writes first: an insert, a rename, and a move out of the scope", async () => {
    const { a } = await withStore([[Handle, { ...ada, state: "claimed" }]], (store) =>
      Effect.gen(function* () {
        const unit = yield* Unit.make(store, world().rules);
        const records = unit.records;
        const rule = world().oneHolderPerName;
        const before = yield* records.findBy(rule, "grace");
        yield* records.insert(Handle, { id: "hdl_2" as never, name: "grace", owner: "o2", note: "x" }, "claimed");
        const inserted = yield* records.findBy(rule, "grace");
        yield* records.update(Handle, "hdl_1", { name: "ada2" });
        const renamedAway = yield* records.findBy(rule, "ada");
        const renamedTo = yield* records.findBy(rule, "ada2");
        yield* unit.setState(Handle, "hdl_1", "released");
        const released = yield* records.findBy(rule, "ada2");
        return { before, inserted, renamedAway, renamedTo, released, stored: yield* store.find(Handle, "hdl_1") };
      }));
    expect(a.before).toBeUndefined();
    expect(a.inserted).toMatchObject({ id: "hdl_2", name: "grace" });
    expect(a.renamedAway).toBeUndefined();
    expect(a.renamedTo).toMatchObject({ id: "hdl_1", name: "ada2" });
    expect(a.released).toBeUndefined();
    expect(a.stored?.instance).toMatchObject({ name: "ada", state: "claimed" }); // nothing was written, only seen
  });
});

describe("the store enforces a rule at commit (G5)", () => {
  it("two calls that both found the name free: the first commit lands and the second is a conflict, writing nothing", async () => {
    const { a, memory } = await withStore([], (store) =>
      Effect.gen(function* () {
        const rule = world().oneHolderPerName;
        const first = yield* Unit.make(store, world().rules);
        const second = yield* Unit.make(store, world().rules);
        const sawFirst = yield* first.records.findBy(rule, "ada");
        const sawSecond = yield* second.records.findBy(rule, "ada");
        yield* first.records.insert(Handle, { id: "hdl_1" as never, name: "ada", owner: "o1", note: "a" }, "claimed");
        yield* second.records.insert(Handle, { id: "hdl_2" as never, name: "ada", owner: "o2", note: "b" }, "claimed");
        yield* second.records.insert(Handle, { id: "hdl_3" as never, name: "other", owner: "o3", note: "c" }, "claimed");
        const one = yield* store.commit({ writes: yield* first.writes, entries: [] });
        const two = yield* store.commit({ writes: yield* second.writes, entries: [] });
        const retry = yield* Unit.make(store, world().rules);
        return { sawFirst, sawSecond, one, two, retried: yield* retry.records.findBy(rule, "ada") };
      }));
    expect([a.sawFirst, a.sawSecond]).toEqual([undefined, undefined]);
    expect([a.one, a.two]).toEqual(["committed", "conflict"]);
    expect(a.retried).toMatchObject({ id: "hdl_1", name: "ada" });
    expect(memory.rows.map((r) => r.instance["id"])).toEqual(["hdl_1"]); // the losing commit wrote none of its inserts
  });

  it("a second rule on the same thing refuses on its own key: the same person and name twice is a conflict even in `released`", async () => {
    const { a } = await withStore([[Handle, { ...ada, state: "released" }]], (store) =>
      Effect.gen(function* () {
        const unit = yield* Unit.make(store, world().rules);
        yield* unit.records.insert(Handle, { id: "hdl_2" as never, name: "ada", owner: "o1", note: "again" }, "released");
        return yield* store.commit({ writes: yield* unit.writes, entries: [] });
      }));
    expect(a).toBe("conflict");
  });

  it("the scope frees the name: a released holder and a new claim live together, and a release makes room", async () => {
    const { a } = await withStore([[Handle, { ...ada, state: "claimed" }]], (store) =>
      Effect.gen(function* () {
        const unit = yield* Unit.make(store, world().rules);
        yield* unit.setState(Handle, "hdl_1", "released");
        const released = yield* store.commit({ writes: yield* unit.writes, entries: [] });
        const again = yield* Unit.make(store, world().rules);
        yield* again.records.insert(Handle, { id: "hdl_2" as never, name: "ada", owner: "o2", note: "b" }, "claimed");
        const claimed = yield* store.commit({ writes: yield* again.writes, entries: [] });
        // A released instance moved back into the scope while the name is held: refused as a conflict, not stored.
        const back = yield* Unit.make(store, world().rules);
        yield* back.setState(Handle, "hdl_1", "claimed");
        const reclaimed = yield* store.commit({ writes: yield* back.writes, entries: [] });
        return { released, claimed, reclaimed, stored: yield* store.find(Handle, "hdl_1") };
      }));
    expect([a.released, a.claimed, a.reclaimed]).toEqual(["committed", "committed", "conflict"]);
    expect(a.stored?.instance).toMatchObject({ state: "released" });
  });

  it("a rule over a structured field compares by what it holds, not as `[object Object]`", async () => {
    const Slot = Blueprint.thing({
      description: "A place someone holds.",
      code: "SL",
      fields: { id: Blueprint.id("slt"), spot: Blueprint.value(Schema.Struct({ row: Schema.Number, seat: Schema.String })) },
    });
    const oneSpot = B.invariant.unique(Slot.fields.spot);
    const spotRules = [{ name: "slot.oneSpot", rule: oneSpot }];
    const memory = storeMemory([[Slot, { id: "slt_1", spot: { row: 1, seat: "a" } }]], spotRules);
    const result = await Effect.runPromise(Effect.gen(function* () {
      const store = yield* Store;
      const unit = yield* Unit.make(store, spotRules);
      const same = yield* unit.records.findBy(oneSpot, { row: 1, seat: "a" });
      const other = yield* unit.records.findBy(oneSpot, { row: 2, seat: "b" });
      yield* unit.records.insert(Slot, { id: "slt_2" as never, spot: { row: 2, seat: "b" } });
      const distinct = yield* store.commit({ writes: yield* unit.writes, entries: [] });
      const dup = yield* Unit.make(store, spotRules);
      yield* dup.records.insert(Slot, { id: "slt_3" as never, spot: { row: 2, seat: "b" } });
      return { same, other, distinct, duplicate: yield* store.commit({ writes: yield* dup.writes, entries: [] }) };
    }).pipe(Effect.provide(memory.layer)) as Effect.Effect<any>);
    expect(result.same).toMatchObject({ id: "slt_1" });
    expect(result.other).toBeUndefined();
    expect([result.distinct, result.duplicate]).toEqual(["committed", "conflict"]);
  });
});

describe("findBy type-checks only for a rule, and the key's own type (G5)", () => {
  const repo = resolve(import.meta.dirname, "../../../../..");
  const fixture = join(repo, "packages/language-effect/test/fixtures/find-by-types");
  it("compiles: a rule and its key are accepted; a wrong key type and a wrong key shape are type errors (G4's `findBy(thing, field, value)` goes at ST1.20, so it is not judged here)", { timeout: 60_000 }, () => {
    // `--pretty false`: with FORCE_COLOR (CI) tsc colours "error" and "TS" apart, so a filter on "error TS" finds nothing and the test passes vacuously.
    const result = spawnSync(join(repo, "node_modules/.bin/tsc"), ["--pretty", "false", "-p", join(fixture, "tsconfig.json")], { cwd: repo, encoding: "utf8" });
    const errors = result.stdout.split("\n").filter((l) => l.includes("error TS"));
    // tsc that dies, or is killed, without printing an error line is not a clean compile.
    if (result.status !== 0 && errors.length === 0) errors.push(`tsc exited ${String(result.status)} with no error line: ${result.stdout}${result.stderr}`);
    expect(errors, "the fixture's `@ts-expect-error` lines must each hide exactly one error, and its other lines none").toEqual([]);
  });
});
