// Counted work across processes (M8.07): a token is held per box and has an identity; a request holds one for its whole life; a sleep
// lends it out and takes it back; a spawn has its own.
import { type Context, Deferred, Effect, Fiber, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { Busy, WorldCount, makeBox, type BusyBox } from "./types.ts";
import { BusyLive, BusyReporting } from "./service.ts";

/** A world's count, in memory: ids carry a generation; `leave` of a stale or released id does nothing. */
const makeWorld = (options: { readonly request?: BusyBox; readonly slowEnter?: Deferred.Deferred<void> } = {}) => {
  const tokens = new Map<string, string>();
  const events: Array<string> = [];
  let generation = 0;
  let next = 0;
  const layer = Layer.succeed(WorldCount, WorldCount.of({
    enter: (owner) => Effect.andThen(options.slowEnter === undefined ? Effect.void : Deferred.await(options.slowEnter), Effect.sync(() => {
      const id = `${generation}.${next++}`;
      tokens.set(id, owner);
      events.push(`+${owner}`);
      return id;
    })),
    leave: (id) => Effect.sync(() => {
      const owner = tokens.get(id);
      if (tokens.delete(id)) events.push(`-${owner}`);
    }),
    name: (id, owner) => Effect.sync(() => void (tokens.has(id) && tokens.set(id, owner))),
    ...(options.request === undefined ? {} : { request: Effect.succeed(options.request) }),
  }));
  return { events, held: () => [...tokens.values()].sort(), reset: () => { generation += 1; tokens.clear(); }, layer: BusyReporting.pipe(Layer.provide(layer)) };
};
const run = <A, E>(e: Effect.Effect<A, E, Busy>, layer: Layer.Layer<Busy> = BusyLive) => Effect.runPromise(Effect.provide(e, layer));

describe("Busy.as", () => {
  it("names each fiber by its owner, and a fiber gives back the token it runs under", () =>
    run(Effect.gen(function* () {
      const busy = yield* Busy;
      const inside = yield* busy.as("probe.spin").counted(busy.held);
      expect(inside).toEqual(["probe.spin"]);
      expect([yield* busy.count, yield* busy.held]).toEqual([0, []]);
    })));

  it("a lent fiber is not running, and is running again once reclaimed", () =>
    run(Effect.gen(function* () {
      const busy = yield* Busy;
      yield* busy.as("probe.nap").counted(Effect.gen(function* () {
        const lease = yield* busy.lend;
        const parked = yield* busy.count;
        yield* lease.reclaim;
        yield* lease.reclaim;
        expect([parked, yield* busy.count]).toEqual([0, 1]);
      }));
    })));
});

describe("BusyReporting: one token per box", () => {
  it("takes a token for the work, gives it back by its id when the work ends, and names it by its owner", async () => {
    const world = makeWorld();
    await run(Effect.gen(function* () {
      const busy = yield* Busy;
      yield* busy.as("probe.spin").counted(Effect.void);
    }), world.layer);
    expect(world.events).toEqual(["+probe.spin", "-probe.spin"]);
    expect(world.held()).toEqual([]);
  });

  it("a request's token, taken at its entry, is held through every counted step of it, retries and the gaps between them", async () => {
    const entry = makeBox("entry:/probe/spin", { id: "0.100", pinned: true });
    const world = makeWorld({ request: entry });
    await run(Effect.gen(function* () {
      const busy = yield* Busy;
      // Attempt, a gap in which authorization reads run, a retry.
      yield* busy.as("probe.spin").counted(Effect.void);
      expect(entry.id).toBe("0.100");
      yield* busy.as("probe.spin").counted(Effect.void);
      expect(entry.id).toBe("0.100");
    }), world.layer);
    // Not once did the request's token go back: the world was never idle under it. The operation named it.
    expect(world.events).toEqual([]);
    expect(entry.owner).toBe("probe.spin");
  });

  it("a sleep lends the request's token out and takes a new one back; the world is idle only while it sleeps", async () => {
    const entry = makeBox("entry:/probe/nap", { pinned: true });
    const world = makeWorld({ request: entry });
    await run(Effect.gen(function* () {
      const busy = yield* Busy;
      yield* busy.as("probe.nap").counted(Effect.gen(function* () {
        expect(world.held()).toEqual(["probe.nap"]);
        const lease = yield* busy.lend;
        expect(world.held()).toEqual([]);
        yield* lease.reclaim;
        expect(world.held()).toEqual(["probe.nap"]);
      }));
      // The work is over; the entry still holds the token until it ends.
      expect(world.held()).toEqual(["probe.nap"]);
    }), world.layer);
  });

  it("a request's token is lent out by a sleep that is not inside counted work too, and taken back on reclaim", async () => {
    const entry = makeBox("entry:/agents/start", { pinned: true });
    const world = makeWorld({ request: entry });
    await run(Effect.gen(function* () {
      const busy = yield* Busy;
      yield* busy.enter;
      yield* busy.leave;
      expect(world.held()).toEqual(["entry:/agents/start"]);
      const lease = yield* busy.lend;
      expect(world.held()).toEqual([]);
      yield* lease.reclaim;
      expect(world.held()).toEqual(["entry:/agents/start"]);
    }), world.layer);
  });

  it("a spawn has a token of its own, taken before the parent's can end", async () => {
    const entry = makeBox("entry:/probe/spin", { id: "0.1", pinned: true });
    const world = makeWorld({ request: entry });
    const gate = Deferred.makeUnsafe<void>();
    await run(Effect.gen(function* () {
      const busy = yield* Busy;
      yield* busy.as("probe.spin").counted(busy.as("agents/run/run_1").spawn(Deferred.await(gate)));
      // The parent's work has ended; the detached work still holds its own token.
      expect(world.held()).toEqual(["agents/run/run_1"]);
      yield* Deferred.succeed(gate, undefined);
      yield* busy.quiet;
      for (let i = 0; i < 5; i++) yield* Effect.yieldNow;
      expect(world.held()).toEqual([]);
    }), world.layer);
  });
});

describe("a token taken while the world is told", () => {
  /** The world's count is slow to answer `enter`; the work is interrupted while it is. */
  const interrupted = (start: (busy: Context.Service.Shape<typeof Busy>) => Effect.Effect<unknown>) =>
    Effect.gen(function* () {
      const gate = Deferred.makeUnsafe<void>();
      const world = makeWorld({ slowEnter: gate });
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
        return { held: world.held(), count: yield* busy.count };
      }).pipe(Effect.provide(world.layer));
    });

  it("counted: interrupted during a pending enter, the world is quiet afterwards", async () => {
    expect(await Effect.runPromise(interrupted((busy) => busy.as("probe.spin").counted(Effect.never)))).toEqual({ held: [], count: 0 });
  });

  it("spawn: interrupted during a pending enter, the detached work still runs and gives its token back", async () => {
    expect(await Effect.runPromise(interrupted((busy) => busy.as("probe.spin").spawn(Effect.void)))).toEqual({ held: [], count: 0 });
  });
});
