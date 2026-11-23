// Counted work across processes (M8.07): tokens carry an owner, and a process reports each one to the world's count.
import { type Context, Deferred, Effect, Fiber, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { Busy, WorldCount } from "./types.ts";
import { BusyLive, BusyReporting } from "./service.ts";

const reported: Array<string> = [];
const world = Layer.succeed(WorldCount, WorldCount.of({
  enter: (owner) => Effect.sync(() => void reported.push(`+${owner}`)),
  leave: (owner) => Effect.sync(() => void reported.push(`-${owner}`)),
}));
const run = <A, E>(e: Effect.Effect<A, E, Busy>, layer: Layer.Layer<Busy> = BusyLive) => {
  reported.length = 0;
  return Effect.runPromise(Effect.provide(e, layer));
};

describe("Busy.as", () => {
  it("names each token by its owner, and a fiber gives back the token it holds", () =>
    run(Effect.gen(function* () {
      const busy = yield* Busy;
      const inside = yield* busy.as("probe.spin").counted(Effect.gen(function* () {
        const held = yield* busy.held;
        // Giving a token back inside the work gives back this work's, whoever the service was asked as.
        yield* busy.leave;
        const after = yield* busy.held;
        yield* busy.enter;
        return { held, after };
      }));
      expect(inside).toEqual({ held: ["probe.spin"], after: [] });
      expect([yield* busy.count, yield* busy.held]).toEqual([0, []]);
    })));

  it("counts an unnamed token for `unnamed`, and spawned work for its owner", () =>
    run(Effect.gen(function* () {
      const busy = yield* Busy;
      const gate = yield* Deferred.make<void>();
      yield* busy.as("agents/run/run_1").spawn(Deferred.await(gate));
      yield* busy.enter;
      expect(yield* busy.held).toEqual(["agents/run/run_1", "unnamed"]);
      yield* busy.leave;
      yield* Deferred.succeed(gate, undefined);
      yield* busy.quiet;
      expect(yield* busy.held).toEqual([]);
    })));
});

describe("BusyReporting", () => {
  it("reports each token it takes and gives back, by owner, to the world's count", () =>
    run(Effect.gen(function* () {
      const busy = yield* Busy;
      yield* busy.as("probe.spin").counted(Effect.void);
      yield* busy.as("probe.nap").counted(Effect.gen(function* () {
        yield* busy.leave;
        yield* busy.enter;
      }));
      expect(reported).toEqual(["+probe.spin", "-probe.spin", "+probe.nap", "-probe.nap", "+probe.nap", "-probe.nap"]);
    }), BusyReporting.pipe(Layer.provide(world))));

  it("hands the entry's token over once the work has taken its own: the work's token is then the only one", async () => {
    const entry = ["entry:/probe/spin"];
    const handing = Layer.succeed(WorldCount, WorldCount.of({
      enter: (owner) => Effect.sync(() => void reported.push(`+${owner}`)),
      leave: (owner) => Effect.sync(() => void reported.push(`-${owner}`)),
      handover: Effect.sync(() => {
        const held = entry.pop();
        if (held !== undefined) reported.push(`-${held}`);
      }),
    }));
    await run(Effect.gen(function* () {
      const busy = yield* Busy;
      yield* busy.as("probe.spin").counted(Effect.void);
      yield* busy.as("probe.spin").counted(Effect.void);
    }), BusyReporting.pipe(Layer.provide(handing)));
    // The world's own token is taken before the entry's is given up, and the entry's goes once.
    expect(reported).toEqual(["+probe.spin", "-entry:/probe/spin", "-probe.spin", "+probe.spin", "-probe.spin"]);
  });

  it("keeps a token the world already counted without reporting it again (a timer counts its sleeper before waking it)", () =>
    run(Effect.gen(function* () {
      const busy = yield* Busy;
      yield* busy.as("probe.nap").adopt;
      expect([yield* busy.count, reported]).toEqual([1, []]);
      yield* busy.as("probe.nap").leave;
      expect(reported).toEqual(["-probe.nap"]);
    }), BusyReporting.pipe(Layer.provide(world))));
});

describe("a token taken while the world is told", () => {
  /** The world's count is slow to answer `enter`; the work is interrupted while it is. */
  const interrupted = (start: (busy: Context.Service.Shape<typeof Busy>) => Effect.Effect<unknown>) =>
    Effect.gen(function* () {
      const gate = Deferred.makeUnsafe<void>();
      const held: Array<string> = [];
      const slow = Layer.succeed(WorldCount, WorldCount.of({
        enter: (owner) => Deferred.await(gate).pipe(Effect.andThen(Effect.sync(() => void held.push(owner)))),
        leave: (owner) => Effect.sync(() => void held.splice(held.indexOf(owner), 1)),
      }));
      return yield* Effect.gen(function* () {
        const busy = yield* Busy;
        const fiber = yield* Effect.forkChild(start(busy));
        yield* Effect.yieldNow;
        const interrupting = yield* Effect.forkChild(Fiber.interrupt(fiber));
        yield* Effect.yieldNow;
        // The interrupt waits for the world to be told; once it is, the token is given back with the work.
        yield* Deferred.succeed(gate, undefined);
        yield* Fiber.join(interrupting);
        for (let i = 0; i < 5; i++) yield* Effect.yieldNow;
        yield* busy.quiet;
        return { held: [...held], count: yield* busy.count };
      }).pipe(Effect.provide(BusyReporting.pipe(Layer.provide(slow))));
    });

  it("counted: interrupted during a pending enter, the world is quiet afterwards", async () => {
    expect(await Effect.runPromise(interrupted((busy) => busy.as("probe.spin").counted(Effect.never)))).toEqual({ held: [], count: 0 });
  });

  it("spawn: interrupted during a pending enter, the detached work still runs and gives its token back", async () => {
    expect(await Effect.runPromise(interrupted((busy) => busy.as("probe.spin").spawn(Effect.void)))).toEqual({ held: [], count: 0 });
  });

  it("a bare enter interrupted while the world is told ends with the process and the world agreeing", async () => {
    const gate = Deferred.makeUnsafe<void>();
    const held: Array<string> = [];
    const slow = Layer.succeed(WorldCount, WorldCount.of({
      enter: (owner) => Deferred.await(gate).pipe(Effect.andThen(Effect.sync(() => void held.push(owner)))),
      leave: () => Effect.void,
    }));
    const seen = await Effect.runPromise(Effect.gen(function* () {
      const busy = yield* Busy;
      const fiber = yield* Effect.forkChild(busy.as("probe.spin").enter);
      yield* Effect.yieldNow;
      const interrupting = yield* Effect.forkChild(Fiber.interrupt(fiber));
      yield* Effect.yieldNow;
      yield* Deferred.succeed(gate, undefined);
      yield* Fiber.join(interrupting);
      return { held: [...held], count: yield* busy.count };
    }).pipe(Effect.provide(BusyReporting.pipe(Layer.provide(slow)))));
    expect(seen).toEqual({ held: ["probe.spin"], count: 1 });
  });

  it("a bare leave interrupted while the world is told ends with the process and the world agreeing", async () => {
    const gate = Deferred.makeUnsafe<void>();
    const held = ["probe.spin"];
    const slow = Layer.succeed(WorldCount, WorldCount.of({
      enter: () => Effect.void,
      leave: (owner) => Deferred.await(gate).pipe(Effect.andThen(Effect.sync(() => void held.splice(held.indexOf(owner), 1)))),
    }));
    const seen = await Effect.runPromise(Effect.gen(function* () {
      const busy = yield* Busy;
      yield* busy.as("probe.spin").adopt;
      const fiber = yield* Effect.forkChild(busy.as("probe.spin").leave);
      yield* Effect.yieldNow;
      const interrupting = yield* Effect.forkChild(Fiber.interrupt(fiber));
      yield* Effect.yieldNow;
      yield* Deferred.succeed(gate, undefined);
      yield* Fiber.join(interrupting);
      return { held: [...held], count: yield* busy.count };
    }).pipe(Effect.provide(BusyReporting.pipe(Layer.provide(slow)))));
    expect(seen).toEqual({ held: [], count: 0 });
  });
});
