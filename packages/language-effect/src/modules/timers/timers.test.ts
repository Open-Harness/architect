import { Effect, Fiber, Layer, Option } from "effect";
import { TestClock } from "effect/testing";
import { describe, expect, it } from "vitest";
import { Busy } from "#modules/work/types.js";
import { BusyLive } from "#modules/work/service.js";
import { Timers } from "./types.ts";
import { TimersMemory } from "./service.ts";

const world = TimersMemory.pipe(Layer.provideMerge(BusyLive), Layer.provideMerge(TestClock.layer()));
const run = <A, E>(e: Effect.Effect<A, E, Busy | Timers>) => Effect.runPromise(Effect.provide(e, world));

describe("Timers", () => {
  it("a durable sleep parks uncounted, and its timer wakes it counted", () =>
    run(Effect.gen(function* () {
      const busy = yield* Busy;
      const timers = yield* Timers;
      let woke = false;
      yield* busy.spawn(Effect.andThen(timers.sleep("allowance:alw_1", "30 days"), Effect.sync(() => (woke = true))));
      yield* busy.quiet;
      const [timer] = yield* timers.pending;
      expect(timer).toMatchObject({ owner: "allowance:alw_1", name: "sleep", at: 30 * 86_400_000 });
      expect(yield* busy.count).toBe(0);
      expect(yield* timers.due(timer!.at - 1)).toBeUndefined();
      expect(yield* timers.due(timer!.at)).toBe(timer!.at);
      yield* timers.fire(timer!.at);
      yield* busy.quiet;
      expect([woke, yield* busy.count, (yield* timers.pending).length]).toEqual([true, 0, 0]);
    })));

  it("interrupting a parked sleep removes its timer and balances counted work", () =>
    run(Effect.gen(function* () {
      const busy = yield* Busy;
      const timers = yield* Timers;
      const child = yield* Effect.forkChild(busy.counted(timers.sleep("rpc", "1 second")), { startImmediately: true });
      expect(yield* timers.pending).toHaveLength(1);
      expect(yield* busy.count).toBe(0);
      yield* Fiber.interrupt(child);
      expect(yield* timers.pending).toHaveLength(0);
      expect(yield* busy.count).toBe(0);
    })));

  it("a bounded port wait parks the caller so the world can fire its deadline", () =>
    run(Effect.gen(function* () {
      const busy = yield* Busy;
      const timers = yield* Timers;
      const within = timers.within;
      if (within === undefined) return yield* Effect.die("TimersMemory must provide bounded waits");
      const child = yield* Effect.forkChild(busy.counted(within("rpc", "1 second", Effect.never)), { startImmediately: true });
      yield* busy.quiet;
      const [deadline] = yield* timers.pending;
      expect(deadline).toMatchObject({ owner: "rpc", name: "deadline", at: 1_000 });
      expect(yield* busy.count).toBe(0);
      if (deadline === undefined) return yield* Effect.die("Missing deadline");
      yield* timers.fire(deadline.at);
      expect(yield* Fiber.join(child)).toEqual(Option.none());
      expect(yield* busy.count).toBe(0);
      expect(yield* busy.counted(within("rpc", "1 second", Effect.succeed(1)))).toEqual(Option.some(1));
      expect(yield* timers.pending).toHaveLength(0);
      expect(yield* busy.count).toBe(0);
    })));

  it("`at` runs its work as counted work when fired", () =>
    run(Effect.gen(function* () {
      const busy = yield* Busy;
      const timers = yield* Timers;
      let ran = 0;
      yield* timers.at(1000, "keeper", "expire", Effect.sync(() => ran++));
      yield* timers.fire(1000);
      yield* busy.quiet;
      expect(ran).toBe(1);
    })));
});
