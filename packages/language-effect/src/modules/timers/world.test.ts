// `Timers` on the world's table (M8.07), against a table that stands in for the world's Durable Object: rows, a count of
// tokens, and a `fire` that counts the sleeper before it wakes it, as the world does.
import { Deferred, Duration, Effect, Fiber, Layer, Option } from "effect";
import { TestClock } from "effect/testing";
import { describe, expect, it } from "vitest";
import { Busy, WorldCount } from "#modules/work/types.js";
import { BusyReporting } from "#modules/work/service.js";
import { DurableTimers, TimerWakes, Timers, WorldTable, type DurableTimer } from "./types.ts";
import { TimersWorld } from "./service.ts";

interface Row { readonly id: number; readonly at: number; readonly owner: string; readonly name: string; readonly holder: string; readonly woken: Deferred.Deferred<void>; token?: string }

/** The world's side, in memory: a table, the world's count of tokens by id, and the way it fires a row (holding a token for the sleeper until it acknowledges). */
const makeWorld = (slowAdd?: Deferred.Deferred<void>) => {
  const rows: Array<Row> = [];
  const durable: Array<DurableTimer> = [];
  const tokens = new Map<string, string>();
  const events: Array<string> = [];
  const forgotten = new Set<number>();
  let next = 1;
  let ids = 0;
  const enter = (owner: string, who = "") => {
    const id = `0.${ids++}`;
    tokens.set(id, owner);
    events.push(`${who}+${owner}`);
    return id;
  };
  const leave = (id: string, who = "") => {
    const owner = tokens.get(id);
    if (tokens.delete(id)) events.push(`${who}-${owner}`);
  };
  const count = Layer.succeed(WorldCount, WorldCount.of({ enter: (o) => Effect.sync(() => enter(o)), leave: (id) => Effect.sync(() => leave(id)) }));
  const table = Layer.succeed(WorldTable, WorldTable.of({
    add: (owner, name, at, holder) => Effect.andThen(slowAdd === undefined ? Effect.void : Deferred.await(slowAdd), Effect.sync(() => {
      const row: Row = { id: next++, at, owner, name, holder, woken: Deferred.makeUnsafe<void>() };
      rows.push(row);
      return row.id;
    })),
    // A row a reset forgot ends its sleeper: the request belongs to a run that is over.
    wait: (id) => Deferred.await(rows.find((r) => r.id === id)!.woken).pipe(Effect.flatMap(() => (forgotten.has(id) ? Effect.interrupt : Effect.void))),
    // The sleeper is back or gave up: the row goes if it had not fired, and the token the world held for it goes back.
    cancel: (id) => Effect.sync(() => {
      const at = rows.findIndex((r) => r.id === id);
      if (at === -1) return;
      const [row] = rows.splice(at, 1);
      if (row?.token !== undefined) leave(row.token, "world");
    }),
    sleeping: Effect.sync(() => rows.filter((r) => !Deferred.isDoneUnsafe(r.woken)).map(({ id, at, owner, name }) => ({ id, at, owner, name }))),
    set: (at, owner, name, wake) => Effect.sync(() => {
      const id = next++;
      durable.push({ id, at, owner, name, wake });
      return id;
    }),
    clear: (owner, name) => Effect.sync(() => {
      const at = durable.findIndex((t) => t.owner === owner && t.name === name);
      if (at === -1) return false;
      durable.splice(at, 1);
      return true;
    }),
    durable: Effect.sync(() => [...durable]),
  }));
  /** The world fires a row: it takes a token for the sleeper first, then wakes it. */
  const fire = (id: number) => Effect.gen(function* () {
    const row = rows.find((r) => r.id === id)!;
    row.token = enter(row.holder, "world");
    yield* Deferred.succeed(row.woken, undefined);
  });
  /** A reset: the row's sleeper is told it was forgotten. */
  const forget = (id: number) => Effect.suspend(() => {
    forgotten.add(id);
    return Deferred.succeed(rows.find((r) => r.id === id)!.woken, undefined);
  });
  return { forget, events, held: () => [...tokens.values()].sort(), rows, durable, fire, layer: TimersWorld.pipe(Layer.provide(table), Layer.provideMerge(BusyReporting.pipe(Layer.provide(count))), Layer.provideMerge(TestClock.layer())) };
};

const wakes = Layer.succeed(TimerWakes, TimerWakes.of({ wake: () => Effect.void }));
const run = <A, E>(world: ReturnType<typeof makeWorld>, e: Effect.Effect<A, E, Busy | Timers | DurableTimers>, provided = true) =>
  Effect.runPromise(Effect.provide(e, provided ? Layer.provideMerge(world.layer, wakes) : world.layer));

describe("Timers on the world's table", () => {
  it("a sleep is a row, lends its token out while parked, and the world holds one for it until it is back", async () => {
    const world = makeWorld();
    await run(world, Effect.gen(function* () {
      const busy = yield* Busy;
      const timers = yield* Timers;
      const done = yield* Deferred.make<void>();
      yield* busy.as("probe.nap").spawn(timers.sleep("probe.nap", Duration.seconds(20)).pipe(Effect.andThen(Deferred.succeed(done, undefined))));
      yield* Effect.yieldNow;
      yield* Effect.yieldNow;
      expect(world.held()).toEqual([]);
      expect(yield* timers.pending).toEqual([{ id: 1, at: 20_000, owner: "probe.nap", name: "sleep" }]);
      yield* world.fire(1);
      yield* Deferred.await(done);
      yield* busy.quiet;
      expect(world.held()).toEqual([]);
      // The token is lent out before the world can look; the world holds one for the sleeper from the firing; the sleeper takes its own
      // before the world lets go of that one; the work then ends and gives its token back.
      expect(world.events).toEqual(["+probe.nap", "-probe.nap", "world+probe.nap", "+probe.nap", "world-probe.nap", "-probe.nap"]);
    }));
  });

  it("a sleeper whose row a reset forgot is interrupted: what follows the sleep (a commit) never runs, and nothing is left counted", async () => {
    const world = makeWorld();
    let committed = false;
    await run(world, Effect.gen(function* () {
      const busy = yield* Busy;
      const timers = yield* Timers;
      const fiber = yield* Effect.forkChild(busy.as("probe.nap").counted(Effect.andThen(timers.sleep("probe.nap", "1 day"), Effect.sync(() => { committed = true; }))));
      yield* Effect.yieldNow;
      yield* Effect.yieldNow;
      yield* world.forget(1);
      const exit = yield* Fiber.await(fiber);
      expect(exit._tag).toBe("Failure");
      expect(committed).toBe(false);
      for (let i = 0; i < 5; i++) yield* Effect.yieldNow;
      expect([world.rows, world.held(), yield* busy.count]).toEqual([[], [], 0]);
    }));
  });

  it("a forgotten row ends a whole `within` call and an `at` waiter, not only the losing branch of a race", async () => {
    const world = makeWorld();
    let committed = false;
    let ran = false;
    await run(world, Effect.gen(function* () {
      const busy = yield* Busy;
      const timers = yield* Timers;
      const waiting = yield* Effect.forkChild(busy.as("agents/run/run_1").counted(Effect.andThen(timers.within!("agents/run/run_1", "1 day", Effect.never), Effect.sync(() => { committed = true; }))));
      yield* timers.at(5000, "keeper/x", "due", Effect.sync(() => { ran = true; }));
      yield* Effect.yieldNow;
      yield* Effect.yieldNow;
      yield* world.forget(1);
      yield* world.forget(2);
      expect((yield* Fiber.await(waiting))._tag).toBe("Failure");
      for (let i = 0; i < 10; i++) yield* Effect.yieldNow;
      expect([committed, ran, world.rows, world.held(), yield* busy.count]).toEqual([false, false, [], [], 0]);
    }));
  });

  it("an interrupted sleep takes its row back and its token with it", async () => {
    const world = makeWorld();
    await run(world, Effect.gen(function* () {
      const busy = yield* Busy;
      const timers = yield* Timers;
      const fiber = yield* Effect.forkChild(busy.as("probe.nap").counted(timers.sleep("probe.nap", "1 hour")));
      yield* Effect.yieldNow;
      yield* Effect.yieldNow;
      yield* Fiber.interrupt(fiber);
      expect(world.rows).toEqual([]);
      expect([yield* busy.count, world.held()]).toEqual([0, []]);
    }));
  });

  it("within: the deadline wins and the work is interrupted; the work winning leaves no row", async () => {
    const world = makeWorld();
    await run(world, Effect.gen(function* () {
      const busy = yield* Busy;
      const timers = yield* Timers;
      const winner = yield* busy.as("agents/run/run_1").counted(timers.within!("agents/run/run_1", "1 minute", Effect.succeed("fast")));
      expect(winner).toEqual(Option.some("fast"));
      expect(world.rows).toEqual([]);
      const late = yield* Effect.forkChild(busy.as("agents/run/run_2").counted(timers.within!("agents/run/run_2", "1 minute", Effect.never)));
      yield* Effect.yieldNow;
      yield* Effect.yieldNow;
      yield* world.fire(2);
      expect(yield* Fiber.join(late)).toEqual(Option.none());
      expect([yield* busy.count, world.held()]).toEqual([0, []]);
    }));
  });

  it("a durable timer with no TimerWakes provided is a defect, and nothing reaches the table", async () => {
    const world = makeWorld();
    const set = Effect.gen(function* () {
      const durable = yield* DurableTimers;
      yield* durable.set(5000, "keeper/membership.renew/mem_1", "due", { kind: "keeper", payload: "due" });
    });
    await expect(run(world, set, false)).rejects.toThrow(/no TimerWakes/);
    expect(world.durable).toEqual([]);
  });

  it("`at` interrupted while the world is told still has a waiter for its row, so the token the world counts is adopted and given back", async () => {
    const gate = Deferred.makeUnsafe<void>();
    const world = makeWorld(gate);
    const ran: Array<string> = [];
    await run(world, Effect.gen(function* () {
      const busy = yield* Busy;
      const timers = yield* Timers;
      const fiber = yield* Effect.forkChild(timers.at(5000, "keeper/membership.renew/mem_1", "due", Effect.sync(() => void ran.push("renewed"))));
      yield* Effect.yieldNow;
      const interrupting = yield* Effect.forkChild(Fiber.interrupt(fiber));
      yield* Effect.yieldNow;
      yield* Deferred.succeed(gate, undefined);
      yield* Fiber.join(interrupting);
      expect(world.rows).toHaveLength(1);
      yield* world.fire(1);
      for (let i = 0; i < 10; i++) yield* Effect.yieldNow;
      yield* busy.quiet;
      expect([ran, world.held()]).toEqual([["renewed"], []]);
    }));
  });

  it("an instant the world cannot hold is a defect before anything reaches the table, whichever way it was asked for", async () => {
    const world = makeWorld();
    const refuse = (e: Effect.Effect<unknown, never, Busy | Timers | DurableTimers>) => expect(run(world, e)).rejects.toThrow(/finite instant/);
    await refuse(Effect.flatMap(Effect.service(Timers), (timers) => timers.sleep("probe.nap", Duration.infinity)));
    await refuse(Effect.flatMap(Effect.service(Timers), (timers) => timers.at(Number.NaN, "keeper/x", "due", Effect.void)));
    await refuse(Effect.flatMap(Effect.service(Timers), (timers) => timers.within!("agents/run/r", Duration.infinity, Effect.never)));
    await refuse(Effect.flatMap(Effect.service(DurableTimers), (durable) => durable.set(Number.POSITIVE_INFINITY, "keeper/x", "due", { kind: "keeper", payload: "x" })));
    expect(world.rows).toEqual([]);
    expect(world.durable).toEqual([]);
  });

  it("DurableTimers go to the world's table", async () => {
    const world = makeWorld();
    await run(world, Effect.gen(function* () {
      const durable = yield* DurableTimers;
      const wake = { kind: "keeper", payload: "due" } as const;
      const id = yield* durable.set(5000, "keeper/membership.renew/mem_1", "due", wake);
      expect(yield* durable.pending).toEqual([{ id, at: 5000, owner: "keeper/membership.renew/mem_1", name: "due", wake }]);
      expect(yield* durable.clear("keeper/membership.renew/mem_1", "due")).toBe(true);
      expect(yield* durable.clear("keeper/membership.renew/mem_1", "due")).toBe(false);
    }));
  });
});
