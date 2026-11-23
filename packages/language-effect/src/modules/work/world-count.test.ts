// Counted work across processes (M8.07): tokens carry an owner, and a process reports each one to the world's count.
import { Deferred, Effect, Layer } from "effect";
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
