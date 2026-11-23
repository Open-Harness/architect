// No write of an old generation reaches a new one (M8.07, I2): a request whose world was reset is interrupted at its write section, its spawn,
// and when a lent or reclaimed token would be of the new run. The world's count is in memory, with a generation a reset moves on.
import { Deferred, Effect, Fiber } from "effect";
import { describe, expect, it } from "vitest";
import { Busy, makeBox } from "./types.ts";
import { makeWorld, run, turns } from "./internal/fake-world.ts";

describe("a request whose world was reset under it", () => {
  it("is interrupted at its write section, and nothing is written", async () => {
    const entry = makeBox("entry:/probe/spin", { id: "0.0", pinned: true });
    const world = makeWorld(entry);
    let written = false;
    await run(world, Effect.gen(function* () {
      const busy = yield* Busy;
      const slow = yield* Deferred.make<void>();
      const request = yield* Effect.forkChild(busy.as("probe.spin").counted(
        Effect.andThen(Deferred.await(slow), busy.fenced(Effect.sync(() => { written = true; }))),
      ));
      yield* turns;
      // The world is reset while the request waits on ordinary I/O.
      world.reset();
      yield* Deferred.succeed(slow, undefined);
      const exit = yield* Fiber.await(request);
      expect(exit._tag).toBe("Failure");
      expect([written, world.open()]).toEqual([false, 0]);
    }));
  });

  it("a request lent across a reset that reclaims and then commits is refused: its new token is of another run, so it is given back and the request is stale", async () => {
    const entry = makeBox("entry:/probe/spin", { id: "0.0", pinned: true });
    const world = makeWorld(entry);
    let written = false;
    await run(world, Effect.gen(function* () {
      const busy = yield* Busy;
      const slow = yield* Deferred.make<void>();
      const request = yield* Effect.forkChild(busy.as("probe.spin").counted(Effect.gen(function* () {
        const lease = yield* busy.lend;
        yield* Deferred.await(slow);
        yield* lease.reclaim;
        yield* busy.fenced(Effect.sync(() => { written = true; }));
      })));
      yield* turns;
      world.reset();
      yield* Deferred.succeed(slow, undefined);
      expect((yield* Fiber.await(request))._tag).toBe("Failure");
      yield* turns;
      // Nothing was written, and no token of the new run is held for the old one.
      expect([written, world.held(), world.open()]).toEqual([false, [], 0]);
    }));
  });

  it("a request whose token is lent out cannot write after a reset either: a section takes a token of its own, and one of another run is refused", async () => {
    const entry = makeBox("entry:/probe/spin", { id: "0.0", pinned: true });
    const world = makeWorld(entry);
    let written = false;
    await run(world, Effect.gen(function* () {
      const busy = yield* Busy;
      const slow = yield* Deferred.make<void>();
      const request = yield* Effect.forkChild(busy.as("probe.spin").counted(Effect.gen(function* () {
        yield* busy.lend;
        yield* Deferred.await(slow);
        yield* busy.fenced(Effect.sync(() => { written = true; }));
      })));
      yield* turns;
      world.reset();
      yield* Deferred.succeed(slow, undefined);
      expect((yield* Fiber.await(request))._tag).toBe("Failure");
      yield* turns;
      expect([written, world.held(), world.open()]).toEqual([false, [], 0]);
    }));
  });

  it("a lent request that is still of the run writes under a token of its own, which it gives back", async () => {
    const entry = makeBox("entry:/probe/spin", { id: "0.0", pinned: true });
    const world = makeWorld(entry);
    await run(world, Effect.gen(function* () {
      const busy = yield* Busy;
      const seen: Array<ReadonlyArray<string>> = [];
      yield* busy.as("probe.spin").counted(Effect.gen(function* () {
        const lease = yield* busy.lend;
        yield* busy.fenced(Effect.sync(() => void seen.push(world.held())));
        // The statement's own token is given back: with the request's lent out, the world holds nothing between statements.
        expect([world.held(), world.open()]).toEqual([[], 0]);
        yield* lease.reclaim;
      }));
      expect(seen).toEqual([["probe.spin"]]);
    }));
  });

  it("a request that is still live writes inside its section, which the world counts while it runs", async () => {
    const entry = makeBox("entry:/probe/spin", { id: "0.0", pinned: true });
    const world = makeWorld(entry);
    await run(world, Effect.gen(function* () {
      const busy = yield* Busy;
      const seen: Array<number> = [];
      yield* busy.as("probe.spin").counted(busy.fenced(Effect.sync(() => void seen.push(world.open()))));
      expect([seen, world.open()]).toEqual([[1], 0]);
    }));
  });

  it("cannot spawn work of its own: a spawn from a request the world no longer holds is interrupted", async () => {
    const entry = makeBox("entry:/probe/spin", { id: "0.0", pinned: true });
    const world = makeWorld(entry);
    let ran = false;
    await run(world, Effect.gen(function* () {
      const busy = yield* Busy;
      const slow = yield* Deferred.make<void>();
      const request = yield* Effect.forkChild(busy.as("probe.spin").counted(
        Effect.andThen(Deferred.await(slow), busy.as("agents/run/run_1").spawn(Effect.sync(() => { ran = true; }))),
      ));
      yield* turns;
      world.reset();
      yield* Deferred.succeed(slow, undefined);
      expect((yield* Fiber.await(request))._tag).toBe("Failure");
      yield* turns;
      // Nothing was spawned, and the request is not counted in the new run.
      expect([ran, world.held()]).toEqual([false, []]);
    }));
  });
});
