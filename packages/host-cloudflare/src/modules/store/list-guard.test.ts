// #764, the D1 store's half: a list's rows count as read. Two calls that each list "no overlapping leave for this employee" and then insert can't both
// commit overlapping rows: one runs again and sees the other. A change outside the list's `where` and `state` doesn't make a call run again. The
// in-memory half is language-effect's records/list-race.test.ts; this runs the same handler through `Handlers.serve` over `StoreD1`, in real workerd and
// real D1, so the build picks how D1 guards a list. The table is test/migrations/0008_leaves.sql. Written by the checks author for Goal 16; the builder
// never edits this file or that migration, and only removes lines from `expected-failing/`. `list` is reached through a cast until it exists.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { env } from "cloudflare:workers";
import { Cause, Deferred, Effect, Exit, Fiber, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { Blueprint } from "orthograph";
import { ErrorNames } from "orthograph/server";
import { BusyLive, Handlers, Records, Store, Unit, type Listed } from "@orthograph/language-effect";
import { Database } from "#modules/database/service.js";
import { StoreD1 } from "./service.ts";

const Day = Blueprint.value(Blueprint.uint(32));
const Leave = Blueprint.thing({
  description: "Days off someone asked for.",
  fields: { id: Blueprint.id("lap"), employee: Blueprint.id("emp"), starts: Day, ends: Day, note: Blueprint.text({ max: 40 }) },
});
class LeaveOverlaps extends Blueprint.error({ other: Leave.fields.id }, { exit: 45 }) {}
ErrorNames.name(LeaveOverlaps, "LeaveOverlaps");
const apply = Blueprint.operation(Leave, {
  description: "Ask for days off, unless they overlap the employee's other open leave.",
  payload: { id: Leave.fields.id, employee: Leave.fields.employee, starts: Leave.fields.starts, ends: Leave.fields.ends },
  answer: { application: Leave.fields.id },
  errors: [LeaveOverlaps],
  allowed: [Blueprint.signedIn],
});
const ada = { kind: "person", person: "per_ada", via: "session" } as const;
const layer = Layer.mergeAll(BusyLive, StoreD1.layer({ tables: [[Leave, "leave"]] }).pipe(Layer.provide(Database.d1(env.DB))));

// Each test has employees of its own, so rows another test left never meet its lists.
let made = 0;
const fresh = (who: string) => `emp_${who}${++made}${Math.random().toString(36).slice(2, 6)}`;
/** An application's id for an employee: `lap_` and the employee's own tag, then `suffix`. */
const lap = (employee: string, suffix: string) => `lap_${employee.slice(4)}${suffix}`;
const seed = (...rows: ReadonlyArray<readonly [string, string, number, number, string]>) =>
  env.DB.batch(rows.map(([id, employee, starts, ends, state]) =>
    env.DB.prepare(`INSERT INTO "leave" ("id", "employee", "starts", "ends", "note", "state", "version") VALUES (?, ?, ?, ?, 'new', ?, 0)`)
      .bind(id, employee, String(starts), String(ends), state)));
const idsOf = (employee: string) => env.DB.prepare(`SELECT "id" FROM "leave" WHERE "employee" = ? ORDER BY rowid`).bind(employee).all<{ id: string }>()
  .then((r) => r.results.map((x) => x.id));

const listOf = (records: any, where: Record<string, unknown>, state: string): Effect.Effect<Listed> =>
  typeof records.list === "function"
    ? records.list({ thing: Leave, where, state, order: "oldest", limit: 50, after: undefined })
    : Effect.die(new Error("Records.list is not built (#764)"));

type Run = { id: string; listed: ReadonlyArray<unknown> };
/** The handler: list the employee's open leave, wait (`between`), then refuse an overlap or insert. Each attempt is recorded in `runs`. */
const served = (runs: Array<Run>, between: (id: string, attempt: number) => Effect.Effect<void>) =>
  Handlers.serve({
    name: "leave.apply",
    operation: apply,
    handler: (({ id, employee, starts, ends }: any) => Effect.gen(function* () {
      const records = yield* Records;
      const { items } = yield* listOf(records, { employee }, "open");
      runs.push({ id, listed: items.map((i) => i["id"]) });
      yield* between(id, runs.filter((r) => r.id === id).length);
      const clash = items.find((i) => (i["starts"] as bigint) <= ends && starts <= (i["ends"] as bigint));
      if (clash) return yield* Effect.fail(new LeaveOverlaps({ other: clash["id"] as never }));
      yield* records.insert(Leave, { id, employee, starts, ends, note: "new" }, "open");
      return { application: id };
    })) as never,
  });
const asks = (id: string, employee: string, starts: number, ends: number) => ({ id, employee, starts: BigInt(starts), ends: BigInt(ends) });
/** A call that died (a missing `list`, a build's defect) is not a refusal: name it before judging the race. */
const died = (exits: ReadonlyArray<Exit.Exit<any, any>>) => exits.flatMap((e) => (Exit.isFailure(e) && Cause.hasDies(e.cause) ? [String(Cause.squash(e.cause))] : []));

describe("two calls that each list, then insert, in D1 (#764)", () => {
  const race = async (overlap: boolean) => {
    const emp = fresh("ada");
    const [a, b] = [lap(emp, "a"), lap(emp, "b")];
    // A cancelled application of hers overlaps both: it is outside the listed state, so it refuses neither.
    await seed([lap(emp, "0"), emp, 1, 30, "cancelled"]);
    const runs: Array<Run> = [];
    const exits = await Effect.runPromise(Effect.gen(function* () {
      // A barrier, not the scheduler: each first attempt waits until both have listed (or the other has ended), so neither commits before the other read.
      const both = yield* Deferred.make<void>();
      let listed = 0;
      const s = served(runs, (_id, attempt) => (attempt > 1 ? Effect.void : Effect.suspend(() => (++listed === 2 ? Deferred.succeed(both, undefined) : Deferred.await(both)))));
      const open = (e: Effect.Effect<any, any, any>) => Effect.ensuring(Effect.exit(e), Deferred.succeed(both, undefined));
      return yield* Effect.all([open(s.run(asks(a, emp, 10, 12) as never, ada)), open(s.run(asks(b, emp, overlap ? 12 : 13, 14) as never, ada))], { concurrency: "unbounded" });
    }).pipe(Effect.provide(layer)) as unknown as Effect.Effect<Array<Exit.Exit<any, any>>>);
    return { exits, runs, a, b, stored: await idsOf(emp), cancelled: lap(emp, "0") };
  };

  it("can't both commit overlapping leave: one runs again, sees the other's row, and is refused", { timeout: 60_000 }, async () => {
    const { exits, runs, a, b, stored, cancelled } = await race(true);
    expect(died(exits), "no call died").toEqual([]);
    expect(runs.slice(0, 2).map((r) => [r.id, r.listed])).toEqual(expect.arrayContaining([[a, []], [b, []]]));
    const won = exits.filter(Exit.isSuccess).map((e) => e.value.application);
    expect(won).toHaveLength(1);
    const lost = won[0] === a ? b : a;
    expect(Cause.squash(exits.find(Exit.isFailure)!.cause)).toMatchObject({ _tag: "LeaveOverlaps", other: won[0] });
    const lostRuns = runs.filter((r) => r.id === lost);
    expect(lostRuns).toHaveLength(2);
    expect(lostRuns[1]!.listed).toEqual([won[0]]);
    expect(stored).toEqual([cancelled, won[0]]);
  });

  it("control: two calls whose leave doesn't overlap both commit", { timeout: 60_000 }, async () => {
    const { exits, a, b, stored, cancelled } = await race(false);
    expect(died(exits), "no call died").toEqual([]);
    expect(exits.map((e) => (Exit.isSuccess(e) ? e.value.application : Cause.squash(e.cause)))).toEqual([a, b]);
    expect([...stored].sort()).toEqual([cancelled, a, b].sort());
  });
});

describe("in D1, a change the list didn't read doesn't make the call run again (#764)", () => {
  type Change = (unit: any, ids: { ada: string; bob: string }) => Effect.Effect<void, any, any>;
  /** Ada's call lists, then waits while `change` commits, then goes on. Answers how the change committed, how ada's call ended, and how many times it ran. */
  const around = async (change: Change) => {
    const ids = { ada: fresh("ada"), bob: fresh("bob") };
    // Ada: one open (lap_1), one cancelled (lap_4), one approved (lap_6). Bob: one open (lap_2).
    await seed([lap(ids.ada, "1"), ids.ada, 1, 3, "open"], [lap(ids.bob, "2"), ids.bob, 1, 3, "open"], [lap(ids.ada, "4"), ids.ada, 50, 51, "cancelled"]);
    const runs: Array<Run> = [];
    const out = await Effect.runPromise(Effect.gen(function* () {
      const store = yield* Store;
      const listed = yield* Deferred.make<void>();
      const go = yield* Deferred.make<void>();
      const s = served(runs, (_id, attempt) => (attempt === 1 ? Effect.andThen(Deferred.succeed(listed, undefined), Deferred.await(go)) : Effect.void));
      const fiber = yield* Effect.forkChild(s.run(asks(lap(ids.ada, "a"), ids.ada, 10, 12) as never, ada));
      // A call that ends before it lists (it died) is the failure, not a wait.
      yield* Effect.raceFirst(Deferred.await(listed), Effect.andThen(Fiber.join(fiber), Effect.die(new Error("ada's call ended before it listed"))));
      const unit: any = yield* Unit.make(store);
      yield* change(unit, ids);
      const changed = yield* store.commit({ writes: yield* unit.writes, entries: [] });
      yield* Deferred.succeed(go, undefined);
      return { changed, exit: yield* Fiber.await(fiber) };
    }).pipe(Effect.provide(layer)) as Effect.Effect<any>);
    return { ...out, runs: runs.length, application: lap(ids.ada, "a") };
  };
  const leave = (id: string, employee: string, starts: bigint, ends: bigint) => ({ id, employee, starts, ends, note: "new" });

  const outside: ReadonlyArray<readonly [string, Change]> = [
    ["another employee's new leave", (u, { bob }) => u.records.insert(Leave, leave(lap(bob, "b"), bob, 10n, 12n), "open")],
    ["another employee's leave changed", (u, { bob }) => u.records.update(Leave, lap(bob, "2"), { starts: 10n, ends: 12n, note: "moved" })],
    // In ada's `where` but outside the listed state: the list never held it.
    ["ada's cancelled leave changed", (u, { ada: a }) => u.records.update(Leave, lap(a, "4"), { starts: 10n, ends: 12n, note: "moved" })],
  ];
  for (const [what, change] of outside) {
    it(`${what}: ada's call commits on its first run`, { timeout: 60_000 }, async () => {
      const { changed, exit, runs, application } = await around(change);
      expect(changed).toBe("committed");
      expect(Exit.isSuccess(exit) ? exit.value : String(Cause.squash(exit.cause))).toEqual({ application });
      expect(runs).toBe(1);
    });
  }

  // Controls: a change inside the listed `where` and `state` does make it run again, even one that leaves no overlap.
  const inside: ReadonlyArray<readonly [string, Change]> = [
    ["ada's new leave on other days", (u, { ada: a }) => u.records.insert(Leave, leave(lap(a, "b"), a, 20n, 21n), "open")],
    ["ada's listed leave changed", (u, { ada: a }) => u.records.update(Leave, lap(a, "1"), { note: "moved" })],
    ["bob's leave moved to ada, on other days", (u, { ada: a, bob }) => u.records.update(Leave, lap(bob, "2"), { employee: a })],
    ["ada's cancelled leave reopened, on other days", (u, { ada: a }) => u.setState(Leave, lap(a, "4"), "open")],
    ["ada's listed leave cancelled", (u, { ada: a }) => u.setState(Leave, lap(a, "1"), "cancelled")],
  ];
  for (const [what, change] of inside) {
    it(`control, ${what}: ada's call runs again and then commits`, { timeout: 60_000 }, async () => {
      const { changed, exit, runs, application } = await around(change);
      expect(changed).toBe("committed");
      expect(Exit.isSuccess(exit) ? exit.value : String(Cause.squash(exit.cause))).toEqual({ application });
      expect(runs).toBe(2);
    });
  }
});
