// #764's done check: a list's rows count as read. Two calls that each list "no overlapping leave for this employee" and then insert can't both commit
// overlapping rows: one runs again and sees the other. And a change outside the listed `where` doesn't make a call run again, so a build can't pass by
// rerunning on every write. Run through the handler wrapper over `storeMemory`, so the build picks how a store guards a list. Written by the checks author
// for Goal 16; the builder never edits this file or `list.test.ts`, and only removes lines from `expected-failing/`.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Cause, Deferred, Effect, Exit, Fiber, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { Blueprint } from "orthograph";
import { ErrorNames } from "orthograph/server";
import { Handlers } from "#modules/handler/service.js";
import { BusyLive } from "#modules/work/service.js";
import { storeMemory, Unit } from "./service.ts";
import { Records, Store, type Listed } from "./types.ts";

const Day = Blueprint.value(Blueprint.uint(32));
const Leave = Blueprint.thing({
  description: "Days off someone asked for.",
  fields: { id: Blueprint.id("lap"), employee: Blueprint.id("emp"), from: Day, to: Day, note: Blueprint.text({ max: 40 }) },
});
// Another thing with an `employee` field: its rows are never in a list of leave.
const Shift = Blueprint.thing({ description: "Hours someone works.", fields: { id: Blueprint.id("shf"), employee: Blueprint.id("emp") } });
class LeaveOverlaps extends Blueprint.error({ other: Leave.fields.id }, { exit: 45 }) {}
ErrorNames.name(LeaveOverlaps, "LeaveOverlaps");
const apply = Blueprint.operation(Leave, {
  description: "Ask for days off, unless they overlap the employee's other open leave.",
  payload: { id: Leave.fields.id, employee: Leave.fields.employee, from: Leave.fields.from, to: Leave.fields.to },
  answer: { application: Leave.fields.id },
  errors: [LeaveOverlaps],
  allowed: [Blueprint.signedIn],
});
const ada = { kind: "person", person: "per_ada", via: "session" } as const;
const row = (id: string, employee: string, from: number, to: number, state = "open") =>
  [Leave, { id, employee, from: BigInt(from), to: BigInt(to), note: "", state }] as const;

const listOf = (records: any, where: Record<string, unknown>, state: string, limit = 50): Effect.Effect<Listed> =>
  typeof records.list === "function"
    ? records.list({ thing: Leave, where, state, order: "oldest", limit, after: undefined })
    : Effect.die(new Error("Records.list is not built (#764)"));

type Run = { id: string; listed: ReadonlyArray<unknown> };
/**
 * The handler: list the employee's open leave (`limit` at most), and with `twice` their approved leave too, wait (`between`), then refuse an overlap or
 * insert. Each attempt is recorded in `runs`.
 */
type Shape = { readonly limit?: number; readonly twice?: boolean };
const served = (runs: Array<Run>, between: (id: string, attempt: number) => Effect.Effect<void>, shape: Shape = {}) =>
  Handlers.serve({
    name: "leave.apply",
    operation: apply,
    handler: (({ id, employee, from, to }: any) => Effect.gen(function* () {
      const records = yield* Records;
      const { items } = yield* listOf(records, { employee }, "open", shape.limit);
      if (shape.twice) yield* listOf(records, { employee }, "approved");
      runs.push({ id, listed: items.map((i) => i["id"]) });
      yield* between(id, runs.filter((r) => r.id === id).length);
      const clash = items.find((i) => (i["from"] as bigint) <= to && from <= (i["to"] as bigint));
      if (clash) return yield* Effect.fail(new LeaveOverlaps({ other: clash["id"] as never }));
      yield* records.insert(Leave, { id, employee, from, to, note: "" }, "open");
      return { application: id };
    })) as never,
  });
const asks = (id: string, from: number, to: number, employee = "emp_ada") => ({ id, employee, from: BigInt(from), to: BigInt(to) });
/** A call that died (a missing `list`, a build's defect) is not a refusal: name it before judging the race. */
const died = (exits: ReadonlyArray<Exit.Exit<any, any>>) => exits.flatMap((e) => (Exit.isFailure(e) && Cause.hasDies(e.cause) ? [String(Cause.squash(e.cause))] : []));

describe("two calls that each list, then insert (#764)", () => {
  const race = (a: ReturnType<typeof asks>, b: ReturnType<typeof asks>) => {
    // A cancelled application of ada's overlaps both: it is outside the listed state, so it refuses neither.
    const memory = storeMemory([row("lap_0", "emp_ada", 1, 30, "cancelled"), row("lap_9", "emp_bob", 1, 30)]);
    const runs: Array<Run> = [];
    return Effect.runPromise(Effect.gen(function* () {
      // A barrier, not the scheduler: each call's first attempt waits until both have listed, so neither commits before the other has read.
      const both = yield* Deferred.make<void>();
      let listed = 0;
      const s = served(runs, (_id, attempt) => (attempt > 1 ? Effect.void : Effect.suspend(() => (++listed === 2 ? Deferred.succeed(both, undefined) : Deferred.await(both)))));
      return yield* Effect.all([s.run(a as never, ada), s.run(b as never, ada)].map((c) => Effect.exit(c)), { concurrency: "unbounded" });
    }).pipe(Effect.provide(Layer.mergeAll(BusyLive, memory.layer))) as Effect.Effect<Array<Exit.Exit<any, any>>>)
      .then((exits) => ({ exits, runs, rows: memory.rows.map((r) => r.instance) }));
  };

  it("can't both commit overlapping leave: one runs again, sees the other's row, and is refused", async () => {
    const { exits, runs, rows } = await race(asks("lap_a", 10, 12), asks("lap_b", 12, 14));
    expect(died(exits), "no call died").toEqual([]);
    // Both listed before either committed: neither saw the other at first.
    expect(runs.slice(0, 2).map((r) => [r.id, r.listed])).toEqual(expect.arrayContaining([["lap_a", []], ["lap_b", []]]));
    const won = exits.filter(Exit.isSuccess).map((e) => e.value.application);
    expect(won).toHaveLength(1);
    const lost = won[0] === "lap_a" ? "lap_b" : "lap_a";
    const failure = exits.find(Exit.isFailure)!;
    expect(Cause.squash(failure.cause)).toMatchObject({ _tag: "LeaveOverlaps", other: won[0] });
    // The loser ran again, and its second list held the winner's row.
    const lostRuns = runs.filter((r) => r.id === lost);
    expect(lostRuns).toHaveLength(2);
    expect(lostRuns[1]!.listed).toEqual([won[0]]);
    expect(runs.filter((r) => r.id === won[0])).toHaveLength(1);
    expect(rows.map((r) => r["id"]).sort()).toEqual(["lap_0", "lap_9", won[0]].sort());
  });

  it("control: two calls whose leave doesn't overlap both commit", async () => {
    const { exits, rows } = await race(asks("lap_a", 10, 12), asks("lap_b", 13, 14));
    expect(died(exits), "no call died").toEqual([]);
    expect(exits.map((e) => (Exit.isSuccess(e) ? e.value.application : Cause.squash(e.cause)))).toEqual(["lap_a", "lap_b"]);
    expect(rows.map((r) => r["id"]).sort()).toEqual(["lap_0", "lap_9", "lap_a", "lap_b"]);
  });
});

describe("a change the list didn't read doesn't make the call run again (#764)", () => {
  /** Ada's call lists, then waits while `change` commits, then goes on. Answers how many times ada's call ran and how it ended. */
  const around = (change: (unit: any) => Effect.Effect<void, any, any>, shape: Shape = {}) => {
    const memory = storeMemory([
      row("lap_1", "emp_ada", 1, 3), row("lap_2", "emp_bob", 1, 3), row("lap_3", "emp_bob", 40, 41), row("lap_4", "emp_ada", 50, 51, "cancelled"),
      row("lap_5", "emp_ada", 60, 61), row("lap_6", "emp_ada", 70, 71, "approved"),
    ]);
    const runs: Array<Run> = [];
    return Effect.runPromise(Effect.gen(function* () {
      const store = yield* Store;
      const listed = yield* Deferred.make<void>();
      const go = yield* Deferred.make<void>();
      const s = served(runs, (_id, attempt) => (attempt === 1 ? Effect.andThen(Deferred.succeed(listed, undefined), Deferred.await(go)) : Effect.void), shape);
      const fiber = yield* Effect.forkChild(s.run(asks("lap_a", 10, 12) as never, ada));
      // A call that ends before it lists (it died) is the failure, not a wait.
      yield* Effect.raceFirst(Deferred.await(listed), Effect.andThen(Fiber.join(fiber), Effect.die(new Error("ada's call ended before it listed"))));
      const unit: any = yield* Unit.make(store);
      yield* change(unit);
      const changed = yield* store.commit({ writes: yield* unit.writes, entries: [] });
      yield* Deferred.succeed(go, undefined);
      return { changed, exit: yield* Fiber.await(fiber) };
    }).pipe(Effect.provide(Layer.mergeAll(BusyLive, memory.layer))) as Effect.Effect<any>).then((a) => ({ ...a, runs: runs.length }));
  };

  const outside: ReadonlyArray<readonly [string, (unit: any) => Effect.Effect<void, any, any>]> = [
    ["another employee's new leave", (u) => u.records.insert(Leave, { id: "lap_b", employee: "emp_bob", from: 10n, to: 12n, note: "" }, "open")],
    ["another employee's leave changed", (u) => u.records.update(Leave, "lap_2", { from: 10n, to: 12n, note: "moved" })],
    // In ada's `where` but outside the listed state: the list never held it.
    ["ada's cancelled leave changed", (u) => u.records.update(Leave, "lap_4", { from: 10n, to: 12n, note: "moved" })],
    // Another thing whose rows carry ada's employee and the listed state's name: not leave, so never listed.
    ["ada's new open shift", (u) => u.records.insert(Shift, { id: "shf_1", employee: "emp_ada" }, "open")],
  ];
  const cases = (list: typeof outside, shape: Shape = {}) => list.map(([what, change]) => [what, change, shape] as const);
  // A page narrower than the where (one of ada's two open rows): the rows past the page don't make the call conflict for good.
  for (const [what, change, shape] of [...cases(outside), ...cases(outside.slice(0, 1), { limit: 1 }).map(([w, c, sh]) => [`${w}, the list a page of 1`, c, sh] as const)]) {
    it(`${what}: ada's call commits on its first run`, async () => {
      const { changed, exit, runs } = await around(change, shape);
      expect(changed).toBe("committed");
      expect(Exit.isSuccess(exit) && exit.value).toEqual({ application: "lap_a" });
      expect(runs).toBe(1);
    });
  }

  // Controls: a change inside the listed `where` does make it run again, even one that leaves no overlap.
  const inside: ReadonlyArray<readonly [string, (unit: any) => Effect.Effect<void, any, any>]> = [
    ["ada's new leave on other days", (u) => u.records.insert(Leave, { id: "lap_b", employee: "emp_ada", from: 20n, to: 21n, note: "" }, "open")],
    ["ada's listed leave changed", (u) => u.records.update(Leave, "lap_1", { note: "moved" })],
    ["bob's leave moved to ada, on other days", (u) => u.records.update(Leave, "lap_3", { employee: "emp_ada" })],
    ["ada's cancelled leave reopened, on other days", (u) => u.setState(Leave, "lap_4", "open")],
    // A listed row that leaves the list changes what the call read, as a new one does.
    ["ada's listed leave cancelled", (u) => u.setState(Leave, "lap_1", "cancelled")],
    ["ada's listed leave moved to bob", (u) => u.records.update(Leave, "lap_1", { employee: "emp_bob" })],
  ];
  // A call that lists twice: a change in either list makes it run again.
  const twice: typeof inside = [
    ["ada's new open leave, the call listing twice", (u) => u.records.insert(Leave, { id: "lap_b", employee: "emp_ada", from: 20n, to: 21n, note: "" }, "open")],
    ["ada's approved leave changed, the call listing twice", (u) => u.records.update(Leave, "lap_6", { note: "moved" })],
  ];
  for (const [what, change, shape] of [...cases(inside), ...cases(twice, { twice: true })]) {
    it(`control, ${what}: ada's call runs again and then commits`, async () => {
      const { changed, exit, runs } = await around(change, shape);
      expect(changed).toBe("committed");
      expect(Exit.isSuccess(exit) && exit.value).toEqual({ application: "lap_a" });
      expect(runs).toBe(2);
    });
  }
});
