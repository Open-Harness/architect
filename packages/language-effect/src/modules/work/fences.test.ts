// A request's token stays held while any fiber of it runs, whoever forked it (M8.07, I1). The world's count is in memory here.
import { Deferred, Effect, Fiber } from "effect";
import { describe, expect, it } from "vitest";
import { Busy, makeBox } from "./types.ts";
import { Timers } from "#modules/timers/types.js";
import { makeWorld, run, sleeps, turns } from "./internal/fake-world.ts";

describe("a request's forked fibers are counted for as long as they run", () => {
  it("Effect.all: a branch that sleeps in parallel with a long one does not lend the token out from under it", async () => {
    const entry = makeBox("entry:/probe/spin", { id: "0.0", pinned: true });
    const world = makeWorld(entry);
    await run(world, Effect.gen(function* () {
      const busy = yield* Busy;
      const [wake, long] = [yield* Deferred.make<void>(), yield* Deferred.make<void>()];
      const request = yield* Effect.forkChild(busy.as("probe.spin").counted(Effect.all([sleeps(busy, wake), Deferred.await(long)], { concurrency: "unbounded" })));
      yield* turns;
      // The sleeper is lent out; the other branch is still working: the world must not look idle.
      expect(world.held()).toEqual(["probe.spin"]);
      yield* Deferred.succeed(wake, undefined);
      yield* Deferred.succeed(long, undefined);
      yield* Fiber.join(request);
      yield* turns;
      expect(world.held()).toEqual(["probe.spin"]);
    }));
  });

  it("raceFirst: the same, whichever branch wins", async () => {
    const entry = makeBox("entry:/probe/spin", { id: "0.0", pinned: true });
    const world = makeWorld(entry);
    await run(world, Effect.gen(function* () {
      const busy = yield* Busy;
      const [wake, long] = [yield* Deferred.make<void>(), yield* Deferred.make<void>()];
      const request = yield* Effect.forkChild(busy.as("probe.spin").counted(Effect.raceFirst(sleeps(busy, wake), Deferred.await(long))));
      yield* turns;
      expect(world.held()).toEqual(["probe.spin"]);
      yield* Deferred.succeed(long, undefined);
      yield* Fiber.join(request);
    }));
  });

  it("a detached child keeps the token after its parent has lent it out, and after the entry has ended", async () => {
    const entry = makeBox("entry:/probe/spin", { id: "0.0", pinned: true });
    const world = makeWorld(entry);
    await run(world, Effect.gen(function* () {
      const busy = yield* Busy;
      const [wake, long] = [yield* Deferred.make<void>(), yield* Deferred.make<void>()];
      const request = yield* Effect.forkChild(busy.as("probe.spin").counted(Effect.gen(function* () {
        yield* Effect.forkDetach(Deferred.await(long));
        yield* sleeps(busy, wake);
      })));
      yield* turns;
      expect(world.held()).toEqual(["probe.spin"]);
      yield* Deferred.succeed(wake, undefined);
      yield* Fiber.join(request);
      yield* turns;
      expect(world.held()).toEqual(["probe.spin"]);
      // The entry ends while the child is still running: the child keeps the token, and gives it back itself when it ends.
      entry.pinned = false;
      expect(world.held()).toEqual(["probe.spin"]);
      yield* Deferred.succeed(long, undefined);
      yield* turns;
      expect(world.held()).toEqual([]);
    }));
  });
});

describe("counted conservatively (the lead's call): a fiber with live children stays counted, unless a combinator of ours says it is joining", () => {
  it("plain Effect.all: the request stays counted until every child is done, the sleeper included, so a move fails NeverQuiet rather than passing a working fiber", async () => {
    const entry = makeBox("entry:/probe/spin", { id: "0.0", pinned: true });
    const world = makeWorld(entry);
    await run(world, Effect.gen(function* () {
      const busy = yield* Busy;
      const [wake, long] = [yield* Deferred.make<void>(), yield* Deferred.make<void>()];
      const request = yield* Effect.forkChild(busy.as("probe.spin").counted(Effect.all([sleeps(busy, wake), Deferred.await(long)], { concurrency: "unbounded" })));
      yield* turns;
      expect(world.held()).toEqual(["probe.spin"]);
      // The long branch is done; the sleeper is lent out; the parent, which only waits, is still counted: loud, not silent.
      yield* Deferred.succeed(long, undefined);
      yield* turns;
      expect(world.held()).toEqual(["probe.spin"]);
      yield* Deferred.succeed(wake, undefined);
      yield* Fiber.join(request);
    }));
  });

  it("Timers.all: a parent that joins is not counted while it waits, so the sleeper can be fired once the working branches are done, and not before", async () => {
    const entry = makeBox("entry:/probe/spin", { id: "0.0", pinned: true });
    const world = makeWorld(entry);
    await run(world, Effect.gen(function* () {
      const busy = yield* Busy;
      const [wake, long] = [yield* Deferred.make<void>(), yield* Deferred.make<void>()];
      const request = yield* Effect.forkChild(busy.as("probe.spin").counted(Timers.all([sleeps(busy, wake), Deferred.await(long)], { concurrency: "unbounded" })));
      yield* turns;
      // The sleeper is lent out, the other branch works (the other branches start after it has lent: the world waits for them before it lets go):
      // the world's count was never empty on the way.
      expect(world.held()).toEqual(["probe.spin"]);
      expect(world.idled()).toBe(0);
      yield* Deferred.succeed(long, undefined);
      yield* turns;
      expect(world.held()).toEqual([]);
      yield* Deferred.succeed(wake, undefined);
      yield* Fiber.join(request);
    }));
  });

  it("Timers.all with the default concurrency runs the effects one after another in the calling fiber, which is working, so it is not joining: a sibling that ends mid-way does not empty the count", async () => {
    const entry = makeBox("entry:/probe/spin", { id: "0.0", pinned: true });
    const world = makeWorld(entry);
    await run(world, Effect.gen(function* () {
      const busy = yield* Busy;
      const [first, second, side] = [yield* Deferred.make<void>(), yield* Deferred.make<void>(), yield* Deferred.make<void>()];
      const request = yield* Effect.forkChild(busy.as("probe.spin").counted(Effect.gen(function* () {
        yield* Effect.forkChild(Deferred.await(side));
        yield* Timers.all([Deferred.await(first), Deferred.await(second)]);
      })));
      yield* turns;
      expect(world.held()).toEqual(["probe.spin"]);
      // The sibling ends while the first read is still in flight: the one fiber left is doing I/O, and the world must not look quiet.
      yield* Deferred.succeed(side, undefined);
      yield* turns;
      expect(world.held()).toEqual(["probe.spin"]);
      yield* Deferred.succeed(first, undefined);
      yield* turns;
      expect(world.held()).toEqual(["probe.spin"]);
      expect(world.idled()).toBe(0);
      yield* Deferred.succeed(second, undefined);
      yield* Fiber.join(request);
    }));
  });

  it("fork and continue: the parent that keeps working while its child sleeps is counted", async () => {
    const entry = makeBox("entry:/probe/spin", { id: "0.0", pinned: true });
    const world = makeWorld(entry);
    await run(world, Effect.gen(function* () {
      const busy = yield* Busy;
      const [wake, own] = [yield* Deferred.make<void>(), yield* Deferred.make<void>()];
      const request = yield* Effect.forkChild(busy.as("probe.spin").counted(Effect.gen(function* () {
        yield* Effect.forkChild(sleeps(busy, wake));
        yield* Deferred.await(own);
      })));
      yield* turns;
      expect(world.held()).toEqual(["probe.spin"]);
      yield* Deferred.succeed(own, undefined);
      yield* Deferred.succeed(wake, undefined);
      yield* Fiber.join(request);
    }));
  });
});
