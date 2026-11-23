// S-19 / HAN-18 (G5 section 6, ST1.11), the unit's and the memory store's half: one call that moves a value between holders (A `x` to `y`, then B `y` to `z`) must
// commit in memory as it does on D1, because the unit writes a row that frees a key before the row that takes it; a straight swap and a clash among the call's own
// rows are the handler's bug and die naming the rule, never a conflict the call would retry; and the memory store applies the writes one at a time and
// checks after each, so it refuses what D1 refuses. The D1 half, with the same cases and the same answers, is
// `packages/host-cloudflare/src/modules/store/write-order.test.ts`. Written by the checks author; the builder never edits this file.
//
// SPELLING. Respelled at ST1.20 from G4's `unique` property (one entry per field) onto G5's rules (`Blueprint.invariant.unique`), handed to the store and the unit
// as `{ name, rule }`; the defect's name is the rule's full name (`handle.oneHolderPerName`, `handle.oneNamePerPerson`). The cases and their answers did not change. The unit's
// `writes` are in commit order and fail as a defect (never a typed failure) when the call's own rows clash or cycle, with a message that names the rule.
// Today the memory store checks final values only and the unit writes in the order the handler made them, so the cases below that move a value fail.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Cause, Effect, Exit } from "effect";
import { describe, expect, it } from "vitest";
import { Blueprint } from "orthograph";
import { storeMemory, Unit } from "./service.ts";
import { Store } from "./types.ts";

const Handle = Blueprint.thing({
  description: "A name someone holds.",
  code: "HD",
  fields: { id: Blueprint.id("hdl"), name: Blueprint.text({ max: 40 }), owner: Blueprint.text({ max: 40 }) },
});
const machine = Blueprint.machine(Handle, {
  states: ["claimed", "released"],
  moves: { claim: { from: [], to: "claimed", emits: Blueprint.event({}) }, release: { from: ["claimed"], to: "released", emits: Blueprint.event({}) } },
  notFrom: { exit: 60 },
});
const B = Blueprint as any;
const rules = [
  { name: "handle.oneHolderPerName", rule: B.invariant.unique(Handle.fields.name, { while: [machine.states.claimed] }) },
  { name: "handle.oneNamePerPerson", rule: B.invariant.unique(Handle.fields.owner, { while: [machine.states.claimed] }) },
];
const row = (id: string, name: string, owner: string, state = "claimed") => [Handle, { id, name, owner, state }] as const;
type Initial = ReadonlyArray<readonly [any, any]>;

const inMemory = <A,>(initial: Initial, f: (store: Store["Service"]) => Effect.Effect<A, any, any>) => {
  const memory = storeMemory(initial as any, rules);
  return Effect.runPromise(Effect.flatMap(Store, f).pipe(Effect.provide(memory.layer)) as Effect.Effect<A>).then((a) => ({ a, memory }));
};
const exitOf = <A,>(initial: Initial, f: (store: Store["Service"]) => Effect.Effect<A, any, any>) => {
  const memory = storeMemory(initial as any, rules);
  return Effect.runPromiseExit(Effect.flatMap(Store, f).pipe(Effect.provide(memory.layer)) as Effect.Effect<A>);
};
const rename = (id: string, version: number, changes: Record<string, string>) => ({ kind: "update", thing: Handle, id, version, changes, state: undefined }) as any;
const move = (id: string, version: number, state: string) => ({ kind: "update", thing: Handle, id, version, changes: {}, state }) as any;
const insert = (id: string, name: string, owner: string) => ({ kind: "insert", thing: Handle, fields: { id, name, owner }, state: "claimed" }) as any;
const commit = (store: Store["Service"], ...writes: any[]) => store.commit({ writes, entries: [] });
const defectMessage = (exit: Exit.Exit<unknown, unknown>) => (Exit.isFailure(exit) ? Cause.pretty(exit.cause) : "");
const isDefect = (exit: Exit.Exit<unknown, unknown>) => Exit.isFailure(exit) && Cause.hasDies(exit.cause);
const idOf = (w: any) => w.id ?? w.fields.id;

describe("S-19 control: what commits today", () => {
  it("two renames to free names, and a plain claim, commit in memory", async () => {
    const { a } = await inMemory([row("hdl_1", "a", "o1"), row("hdl_2", "b", "o2")], (store) => Effect.gen(function* () {
      const first = yield* commit(store, rename("hdl_1", 0, { name: "x" }), rename("hdl_2", 0, { name: "y" }));
      const unit = yield* Unit.make(store, rules);
      yield* unit.records.insert(Handle, { id: "hdl_3" as never, name: "c", owner: "o3" }, "claimed");
      return { first, second: yield* commit(store, ...(yield* unit.writes)) };
    }));
    expect([a.first, a.second]).toEqual(["committed", "committed"]);
  });

  it("accepts a take that comes after the free, in the order the writes are given", async () => {
    const { a, memory } = await inMemory([row("hdl_1", "x", "o1"), row("hdl_2", "y", "o2")], (store) => commit(store, rename("hdl_2", 0, { name: "z" }), rename("hdl_1", 0, { name: "y" })));
    expect(a).toBe("committed");
    expect(memory.rows.map((r) => r.instance["name"])).toEqual(["y", "z"]);
  });

  it("keeps the handler's order for rows that free nothing and take nothing", async () => {
    const { a } = await inMemory([row("hdl_1", "a", "o1"), row("hdl_2", "b", "o2")], (store) => Effect.gen(function* () {
      const unit = yield* Unit.make(store, rules);
      yield* unit.records.update(Handle, "hdl_2", { name: "bb" });
      yield* unit.records.update(Handle, "hdl_1", { name: "aa" });
      return (yield* unit.writes).map(idOf);
    }));
    expect(a).toEqual(["hdl_2", "hdl_1"]);
  });

  it("a clash with a row this call did not write is the store's conflict to decide, not a defect of the call", async () => {
    const { a } = await inMemory([row("hdl_1", "x", "o1")], (store) => Effect.gen(function* () {
      const unit = yield* Unit.make(store, rules);
      yield* unit.records.insert(Handle, { id: "hdl_2" as never, name: "x", owner: "o2" }, "claimed");
      return { exit: yield* Effect.exit(unit.writes), outcome: yield* commit(store, insert("hdl_2", "x", "o2")) };
    }));
    expect(isDefect(a.exit as any)).toBe(false);
    expect(a.outcome).toBe("conflict");
  });
});

describe("the memory store applies writes one at a time (S-19)", () => {
  it("refuses a write that takes a key an earlier row of the commit's order still holds, as a conflict, and writes none of it", async () => {
    const { a, memory } = await inMemory([row("hdl_1", "x", "o1"), row("hdl_2", "y", "o2")], (store) =>
      commit(store, rename("hdl_1", 0, { name: "y" }), rename("hdl_2", 0, { name: "z" })));
    expect(a).toBe("conflict");
    expect(memory.rows.map((r) => r.instance["name"])).toEqual(["x", "y"]);
  });

  it("refuses a straight swap in either order, though its final values are distinct", async () => {
    for (const order of [[0, 1], [1, 0]] as const) {
      const writes = [rename("hdl_1", 0, { name: "y" }), rename("hdl_2", 0, { name: "x" })];
      const { a } = await inMemory([row("hdl_1", "x", "o1"), row("hdl_2", "y", "o2")], (store) => commit(store, ...order.map((i) => writes[i])));
      expect(a, `order ${order.join(",")}`).toBe("conflict");
    }
  });

  it("a row that leaves the scope frees its key for the next write; an insert that comes first is refused", async () => {
    const free = await inMemory([row("hdl_1", "x", "o1")], (store) => commit(store, move("hdl_1", 0, "released"), insert("hdl_2", "x", "o2")));
    expect(free.a).toBe("committed");
    const taken = await inMemory([row("hdl_1", "x", "o1")], (store) => commit(store, insert("hdl_2", "x", "o2"), move("hdl_1", 0, "released")));
    expect(taken.a, "the insert comes first and takes `x` while hdl_1 still holds it").toBe("conflict");
  });
});

describe("the unit orders its writes: frees before takes (S-19)", () => {
  it("A `x` to `y` then B `y` to `z`: the unit writes B first, and the call commits", async () => {
    const { a } = await inMemory([row("hdl_1", "x", "o1"), row("hdl_2", "y", "o2")], (store) => Effect.gen(function* () {
      const unit = yield* Unit.make(store, rules);
      yield* unit.records.update(Handle, "hdl_1", { name: "y" });
      yield* unit.records.update(Handle, "hdl_2", { name: "z" });
      const writes = yield* unit.writes;
      return { order: writes.map(idOf), outcome: yield* commit(store, ...writes) };
    }));
    expect(a.order).toEqual(["hdl_2", "hdl_1"]);
    expect(a.outcome).toBe("committed");
  });

  it("a chain of three moves is written from the end of the chain back", async () => {
    const { a } = await inMemory([row("hdl_1", "a", "o1"), row("hdl_2", "b", "o2"), row("hdl_3", "c", "o3")], (store) => Effect.gen(function* () {
      const unit = yield* Unit.make(store, rules);
      yield* unit.records.update(Handle, "hdl_1", { name: "b" });
      yield* unit.records.update(Handle, "hdl_2", { name: "c" });
      yield* unit.records.update(Handle, "hdl_3", { name: "d" });
      const writes = yield* unit.writes;
      return { order: writes.map(idOf), outcome: yield* commit(store, ...writes) };
    }));
    expect(a.order).toEqual(["hdl_3", "hdl_2", "hdl_1"]);
    expect(a.outcome).toBe("committed");
  });

  it("a release and a claim of the same name in one call: the release is written first", async () => {
    const { a } = await inMemory([row("hdl_1", "x", "o1")], (store) => Effect.gen(function* () {
      const unit = yield* Unit.make(store, rules);
      yield* unit.records.insert(Handle, { id: "hdl_2" as never, name: "x", owner: "o2" }, "claimed");
      yield* unit.setState(Handle, "hdl_1", "released");
      const writes = yield* unit.writes;
      return { first: idOf(writes[0]), outcome: yield* commit(store, ...writes) };
    }));
    expect(a.first).toBe("hdl_1");
    expect(a.outcome).toBe("committed");
  });
});

describe("a call that cannot be ordered, or clashes with itself, is a defect naming the rule (S-19)", () => {
  it("a straight swap has no order: it dies, naming the rule, not a conflict", async () => {
    const exit = await exitOf([row("hdl_1", "x", "o1"), row("hdl_2", "y", "o2")], (store) => Effect.gen(function* () {
      const unit = yield* Unit.make(store, rules);
      yield* unit.records.update(Handle, "hdl_1", { name: "y" });
      yield* unit.records.update(Handle, "hdl_2", { name: "x" });
      return yield* unit.writes;
    }));
    expect(isDefect(exit), defectMessage(exit)).toBe(true);
    expect(defectMessage(exit)).toMatch(/handle\.oneHolderPerName/);
  });

  it("two rules whose frees and takes cross die too, naming one of them", async () => {
    // hdl_1 frees name `x` and takes owner `o2`; hdl_2 frees owner `o2` and takes name `x`: each must be written after the other.
    const exit = await exitOf([row("hdl_1", "x", "o1"), row("hdl_2", "y", "o2")], (store) => Effect.gen(function* () {
      const unit = yield* Unit.make(store, rules);
      yield* unit.records.update(Handle, "hdl_1", { name: "z", owner: "o2" });
      yield* unit.records.update(Handle, "hdl_2", { name: "x", owner: "o9" });
      return yield* unit.writes;
    }));
    expect(isDefect(exit), defectMessage(exit)).toBe(true);
    expect(defectMessage(exit)).toMatch(/handle\.(oneHolderPerName|oneNamePerPerson)/);
  });

  it("two inserts of one name in one call clash with themselves: a defect, found before any commit", async () => {
    const { a, memory } = await inMemory([], (store) => Effect.gen(function* () {
      const unit = yield* Unit.make(store, rules);
      yield* unit.records.insert(Handle, { id: "hdl_1" as never, name: "same", owner: "o1" }, "claimed");
      yield* unit.records.insert(Handle, { id: "hdl_2" as never, name: "same", owner: "o2" }, "claimed");
      return yield* Effect.exit(unit.writes);
    }));
    expect(isDefect(a as any), defectMessage(a as any)).toBe(true);
    expect(defectMessage(a as any)).toMatch(/handle\.oneHolderPerName/);
    expect(memory.rows).toEqual([]);
  });
});
