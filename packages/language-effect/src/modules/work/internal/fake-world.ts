// An in-memory world for the tests of counted work: tokens with `<generation>.<n>` ids, write sections, and a reset that moves the generation on.
import { Deferred, Effect, Layer } from "effect";
import { Busy, WorldCount, type BusyBox, type BusyShape } from "../types.ts";
import { BusyReporting } from "../service.ts";

export const makeWorld = (request: BusyBox | undefined) => {
  const tokens = new Map<string, string>(request === undefined ? [] : [[request.id!, request.owner]]);
  const sections = new Map<string, number>();
  let generation = 0;
  let next = 0;
  /** How many times the world's count went empty. */
  let idled = 0;
  const count = Layer.succeed(WorldCount, WorldCount.of({
    enter: (owner) => Effect.sync(() => { const id = `${generation}.${next++}`; tokens.set(id, owner); return id; }),
    leave: (id) => Effect.sync(() => { tokens.delete(id); if (tokens.size === 0) idled += 1; }),
    name: (id, owner) => Effect.sync(() => void (tokens.has(id) && tokens.set(id, owner))),
    valid: (id) => Effect.sync(() => tokens.has(id)),
    section: (id) => Effect.sync(() => { if (!tokens.has(id)) return false; sections.set(id, (sections.get(id) ?? 0) + 1); return true; }),
    sectionEnd: (id) => Effect.sync(() => void sections.set(id, (sections.get(id) ?? 1) - 1)),
    request: Effect.succeed(request),
  }));
  return {
    held: () => [...tokens.values()].sort(),
    idled: () => idled,
    open: () => [...sections.values()].reduce((a, b) => a + b, 0),
    reset: () => { generation += 1; tokens.clear(); },
    layer: BusyReporting.pipe(Layer.provide(count)),
  };
};
export const turns = Effect.forEach(Array.from({ length: 16 }), () => Effect.yieldNow, { discard: true });
export const run = <A, E>(world: { readonly layer: Layer.Layer<Busy> }, e: Effect.Effect<A, E, Busy>) => Effect.runPromise(Effect.provide(e, world.layer));

/** A branch that sleeps: it lends its token out, and takes it back when `wake` opens. */
export const sleeps = (busy: BusyShape, wake: Deferred.Deferred<void>) =>
  Effect.gen(function* () {
    const lease = yield* busy.lend;
    yield* Deferred.await(wake);
    yield* lease.reclaim;
  });

