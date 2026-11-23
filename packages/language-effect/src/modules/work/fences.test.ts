// A request's token stays held while any fiber of it runs, whoever forked it, and no write of an old generation reaches a new one (M8.07,
// I1 and I2). The world's count is in memory here, with a generation a reset moves on.
import { Deferred, Effect, Fiber, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { Busy, WorldCount, makeBox, type BusyBox, type BusyShape } from "./types.ts";
import { BusyReporting } from "./service.ts";

const makeWorld = (request: BusyBox) => {
  const tokens = new Map<string, string>([[request.id!, request.owner]]);
  const sections = new Map<string, number>();
  let generation = 0;
  let next = 0;
  const count = Layer.succeed(WorldCount, WorldCount.of({
    enter: (owner) => Effect.sync(() => { const id = `${generation}.${next++}`; tokens.set(id, owner); return id; }),
    leave: (id) => Effect.sync(() => void tokens.delete(id)),
    name: (id, owner) => Effect.sync(() => void (tokens.has(id) && tokens.set(id, owner))),
    valid: (id) => Effect.sync(() => tokens.has(id)),
    section: (id) => Effect.sync(() => { if (!tokens.has(id)) return false; sections.set(id, (sections.get(id) ?? 0) + 1); return true; }),
    sectionEnd: (id) => Effect.sync(() => void sections.set(id, (sections.get(id) ?? 1) - 1)),
    request: Effect.succeed(request),
  }));
  return {
    held: () => [...tokens.values()].sort(),
    open: () => [...sections.values()].reduce((a, b) => a + b, 0),
    reset: () => { generation += 1; tokens.clear(); },
    layer: BusyReporting.pipe(Layer.provide(count)),
  };
};
const turns = Effect.forEach(Array.from({ length: 16 }), () => Effect.yieldNow, { discard: true });
const run = <A, E>(world: { readonly layer: Layer.Layer<Busy> }, e: Effect.Effect<A, E, Busy>) => Effect.runPromise(Effect.provide(e, world.layer));

/** A branch that sleeps: it lends its token out, and takes it back when `wake` opens. */
const sleeps = (busy: BusyShape, wake: Deferred.Deferred<void>) =>
  Effect.gen(function* () {
    const lease = yield* busy.lend;
    yield* Deferred.await(wake);
    yield* lease.reclaim;
  });

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
