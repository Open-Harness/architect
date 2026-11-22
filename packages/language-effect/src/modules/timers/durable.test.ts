// DurableTimers (M8-timers-shape): a timer that outlives the fiber and the process, handed back through the host's
// TimerWakes. In memory here; the world's table keeps the same rules from M8.07.
import { Effect, Layer } from "effect";
import { TestClock } from "effect/testing";
import { describe, expect, it } from "vitest";
import { Busy } from "#modules/work/types.js";
import { BusyLive } from "#modules/work/service.js";
import { DurableTimers, Timers, type DurableTimer } from "./types.ts";
import { TimersMemory, wakesByKind } from "./service.ts";

const woken: Array<DurableTimer> = [];
const wakes = wakesByKind({ workflow: (t) => Effect.sync(() => void woken.push(t)) });
const world = TimersMemory.pipe(Layer.provideMerge(wakes), Layer.provideMerge(BusyLive), Layer.provideMerge(TestClock.layer()));
const run = <A, E>(e: Effect.Effect<A, E, Busy | Timers | DurableTimers>) => {
  woken.length = 0;
  return Effect.runPromise(Effect.provide(e, world));
};
const wake = { kind: "workflow", payload: { deferred: "tok_1" } } as const;

describe("DurableTimers", () => {
  it("a durable timer fires once, through the host's wake for its kind, as counted work", () =>
    run(Effect.gen(function* () {
      const durable = yield* DurableTimers;
      const timers = yield* Timers;
      const busy = yield* Busy;
      const id = yield* durable.set(5000, "workflows/publish/ex_1", "cooldown", wake);
      expect(yield* durable.pending).toEqual([{ id, at: 5000, owner: "workflows/publish/ex_1", name: "cooldown", wake }]);
      expect(yield* timers.due(10_000)).toBe(5000);
      yield* timers.fire(5000);
      yield* busy.quiet;
      expect(woken).toEqual([{ id, at: 5000, owner: "workflows/publish/ex_1", name: "cooldown", wake }]);
      expect(yield* durable.pending).toEqual([]);
    })));

  it("setting it again while pending keeps the first instant and wake: a replayed activity sets nothing new", () =>
    run(Effect.gen(function* () {
      const durable = yield* DurableTimers;
      const first = yield* durable.set(5000, "agents/run/run_1", "backoff-1", wake);
      const again = yield* durable.set(9000, "agents/run/run_1", "backoff-1", { kind: "workflow", payload: "other" });
      expect(again).toBe(first);
      expect((yield* durable.pending).map((t) => [t.at, t.wake])).toEqual([[5000, wake]]);
    })));

  it("clear removes a pending one, and it never fires; a cleared or fired one clears as false", () =>
    run(Effect.gen(function* () {
      const durable = yield* DurableTimers;
      const timers = yield* Timers;
      yield* durable.set(5000, "keeper/membership.lapse/mem_1", "due", wake);
      expect(yield* durable.clear("keeper/membership.lapse/mem_1", "due")).toBe(true);
      expect(yield* durable.clear("keeper/membership.lapse/mem_1", "due")).toBe(false);
      expect(yield* timers.fire(5000)).toEqual([]);
      expect(woken).toEqual([]);
    })));

  it("a sleep and a durable timer due at one instant fire in the order they were set", () =>
    run(Effect.gen(function* () {
      const durable = yield* DurableTimers;
      const timers = yield* Timers;
      const busy = yield* Busy;
      const order: Array<string> = [];
      yield* timers.at(5000, "a", "first", Effect.sync(() => void order.push("at")));
      yield* durable.set(5000, "b", "second", wake);
      const fired = yield* timers.fire(5000);
      yield* busy.quiet;
      expect(fired.map((t) => t.name)).toEqual(["first", "second"]);
      expect([order, woken.map((t) => t.name)]).toEqual([["at"], ["second"]]);
    })));

  it("a wake of a kind with no handler fails the firing and leaves its timer pending", () =>
    run(Effect.gen(function* () {
      const durable = yield* DurableTimers;
      const timers = yield* Timers;
      yield* durable.set(5000, "x/1", "due", { kind: "nobody", payload: null });
      const exit = yield* Effect.exit(timers.fire(5000));
      expect(exit._tag).toBe("Failure");
      expect((yield* durable.pending).map((t) => [t.owner, t.at])).toEqual([["x/1", 5000]]);
    })));

  it("a durable timer at an instant that is not a finite number is a defect", () =>
    run(Effect.gen(function* () {
      const durable = yield* DurableTimers;
      const exit = yield* Effect.exit(durable.set(Number.NaN, "x/1", "due", wake));
      expect([exit._tag, (yield* durable.pending).length]).toEqual(["Failure", 0]);
    })));

  it("setting a durable timer with no TimerWakes provided is a defect: nothing could fire it", () =>
    Effect.runPromise(Effect.gen(function* () {
      const durable = yield* DurableTimers;
      const exit = yield* Effect.exit(durable.set(1, "x", "y", wake));
      expect(exit._tag).toBe("Failure");
    }).pipe(Effect.provide(TimersMemory.pipe(Layer.provideMerge(BusyLive), Layer.provideMerge(TestClock.layer())))))
  );
});
