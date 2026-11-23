import { Deferred, Effect, Layer } from "effect";
import { Busy, BusyOwner, WorldCount, type BusyShape } from "./types.ts";

type Report = { readonly enter: (owner: string) => Effect.Effect<void>; readonly leave: (owner: string) => Effect.Effect<void>; readonly handover?: Effect.Effect<void> };

/** One process's count, its tokens by owner; when `world` is given, each token is reported to the world's count too. */
const counting = (world?: Report): BusyShape => {
  let count = 0;
  const owners = new Map<string, number>();
  let waiters: Array<Deferred.Deferred<void>> = [];
  const adopted = (owner: string) => Effect.sync(() => {
    count++;
    owners.set(owner, (owners.get(owner) ?? 0) + 1);
  });
  const take = (owner: string) => Effect.andThen(adopted(owner), world === undefined ? Effect.void : Effect.andThen(world.enter(owner), world.handover ?? Effect.void));
  const give = (owner: string) => Effect.suspend(() => {
    count--;
    if (count < 0) return Effect.die(new Error("Busy: a token was given back that was never taken"));
    const left = (owners.get(owner) ?? 1) - 1;
    if (left <= 0) owners.delete(owner);
    else owners.set(owner, left);
    const reported = world === undefined ? Effect.void : world.leave(owner);
    if (count > 0) return reported;
    const ready = waiters;
    waiters = [];
    return Effect.andThen(Effect.forEach(ready, (d) => Deferred.succeed(d, undefined), { discard: true }), reported);
  });
  const quiet = Effect.suspend(() => {
    if (count === 0) return Effect.void;
    const d = Deferred.makeUnsafe<void>();
    waiters.push(d);
    return Deferred.await(d);
  });
  const named = (fixed: string | undefined): BusyShape => {
    const owner = fixed === undefined ? Effect.service(BusyOwner) : Effect.succeed(fixed);
    // The work runs knowing whom its token is counted for, so a sleep inside it gives back that same token.
    // Taking the token (which tells the world, an RPC) and the cleanup that gives it back are one uninterruptible step: an
    // interrupt that arrives while the world is being told waits for it, then ends the work and gives the token back, so a
    // token is never taken without a way to give it back. The detached fiber of `spawn` is forked inside the same step.
    const holding = <A, E, R>(restore: <X, Y, Z>(e: Effect.Effect<X, Y, Z>) => Effect.Effect<X, Y, Z>, work: Effect.Effect<A, E, R>, o: string) =>
      Effect.ensuring(restore(Effect.provideService(work, BusyOwner, o)), give(o));
    return {
      counted: (work) => Effect.flatMap(owner, (o) => Effect.uninterruptibleMask((restore) => Effect.andThen(take(o), holding(restore, work, o)))),
      spawn: (work) => Effect.flatMap(owner, (o) => Effect.uninterruptibleMask((restore) => Effect.andThen(take(o), Effect.forkDetach(holding(restore, work, o))))).pipe(Effect.asVoid),
      // Taking or giving back is local work plus the world being told: one step, so the two counts never part.
      enter: Effect.uninterruptible(Effect.flatMap(owner, take)),
      leave: Effect.uninterruptible(Effect.flatMap(owner, give)),
      adopt: Effect.flatMap(owner, adopted),
      count: Effect.sync(() => count),
      held: Effect.sync(() => [...owners].flatMap(([o, n]) => Array.from({ length: n }, () => o))),
      quiet,
      as: (o) => named(o),
    };
  };
  return named(undefined);
};

/** Counted work inside one process. */
export const BusyLive = Layer.sync(Busy, () => counting());

/** Counted work that also reports to the world's count, so the world knows every process's work in flight (M8.07). */
export const BusyReporting: Layer.Layer<Busy, never, WorldCount> = Layer.effect(Busy, Effect.map(Effect.service(WorldCount), (world) => counting(world)));
