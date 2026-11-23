import { Deferred, Effect, Layer } from "effect";
import { Busy, BusyBoxRef, WorldCount, makeBox, type BusyBox, type BusyShape, type Lease } from "./types.ts";

type Report = {
  readonly enter: (owner: string) => Effect.Effect<string>;
  readonly leave: (id: string) => Effect.Effect<void>;
  readonly name?: ((id: string, owner: string) => Effect.Effect<void>) | undefined;
  readonly valid?: ((id: string) => Effect.Effect<boolean>) | undefined;
  readonly request?: Effect.Effect<BusyBox | undefined> | undefined;
};

/** One process's count of the fibers it runs, and (when `world` is given) the token each box holds in the world's count. */
const counting = (world?: Report): BusyShape => {
  const active = new Set<BusyBox>();
  const shared = new Map<string, BusyBox>();
  let waiters: Array<Deferred.Deferred<void>> = [];
  /** The fibers running now: a lent one is parked, not running. */
  const running = () => [...active].reduce((n, box) => n + Math.max(0, box.holders - box.lent), 0);
  // Waiters are let go from a fiber of their own, on the next turn: whoever lent a token out finishes recording its lease before any
  // waiter sees the process idle.
  const wake = Effect.suspend(() => {
    if (running() > 0) return Effect.void;
    return Effect.asVoid(Effect.forkDetach(Effect.andThen(Effect.yieldNow, Effect.suspend(() => {
      if (running() > 0) return Effect.void;
      const ready = waiters;
      waiters = [];
      return Effect.forEach(ready, (d) => Deferred.succeed(d, undefined), { discard: true });
    }))));
  });
  /** Does the world hold this box's token now: a fiber of it runs, or (a request's box) it is between its fibers; never while every fiber is lent. */
  const wants = (box: BusyBox) => box.holders > box.lent || (box.pinned && box.holders === 0 && box.lent === 0);
  /**
   * One step at a time per box (`box.gate`, which the entry's end takes too), so two fibers cannot take two tokens and the entry cannot
   * end between a take and its record. Telling the world takes time, and what the box wants can change meanwhile: it is read again
   * afterwards, and a token just taken that nothing needs now is given back, so none is left that nobody will release.
   */
  const sync = (box: BusyBox): Effect.Effect<void> =>
    box.gate.withPermits(1)(Effect.gen(function* () {
      if (world === undefined) return;
      if (wants(box) && box.id === undefined) box.id = yield* world.enter(box.owner);
      // The box holds an id: the world must still know it. After a reset it does not, and the request would run unseen.
      else if (wants(box) && box.id !== undefined && world.valid !== undefined && !(yield* world.valid(box.id))) box.id = yield* world.enter(box.owner);
      if (!wants(box) && box.id !== undefined) {
        const id = box.id;
        box.id = undefined;
        yield* world.leave(id);
      }
    }));
  const acquire = (box: BusyBox) => Effect.andThen(Effect.sync(() => { box.holders++; active.add(box); }), sync(box));
  const release = (box: BusyBox) =>
    Effect.andThen(Effect.sync(() => { box.holders--; if (box.holders <= 0) active.delete(box); }), Effect.andThen(sync(box), wake));
  /** The box this fiber runs under; else its request's; else the owner's own, shared by whoever asks for that owner. */
  const boxOf = (fixed: string | undefined): Effect.Effect<BusyBox> =>
    Effect.gen(function* () {
      const current = yield* Effect.service(BusyBoxRef);
      if (current !== undefined) return current;
      const request = world?.request === undefined ? undefined : yield* world.request;
      if (request !== undefined) {
        // The operation names the request's token (the entry named it by its path).
        if (fixed !== undefined && request.owner !== fixed && request.owner.startsWith("entry:")) {
          request.owner = fixed;
          if (request.id !== undefined && world?.name !== undefined) yield* world.name(request.id, fixed);
        }
        return request;
      }
      const owner = fixed ?? "unnamed";
      let box = shared.get(owner);
      if (box === undefined) {
        box = makeBox(owner);
        shared.set(owner, box);
      }
      return box;
    });
  const named = (fixed: string | undefined): BusyShape => {
    const own = (): BusyBox => makeBox(fixed ?? "unnamed");
    return {
      // Taking the token and the cleanup that gives it back are one uninterruptible step: an interrupt that arrives while the world is
      // being told waits for it, then ends the work and gives the token back.
      counted: (work) => Effect.flatMap(boxOf(fixed), (box) =>
        Effect.uninterruptibleMask((restore) => Effect.andThen(acquire(box), Effect.ensuring(restore(Effect.provideService(work, BusyBoxRef, box)), release(box))))),
      // Its own token, taken before this returns and so before the caller's can end.
      spawn: (work) => Effect.suspend(() => {
        const box = own();
        return Effect.uninterruptibleMask((restore) =>
          Effect.andThen(acquire(box), Effect.forkDetach(Effect.ensuring(restore(Effect.provideService(work, BusyBoxRef, box)), release(box)))));
      }).pipe(Effect.asVoid),
      enter: Effect.uninterruptible(Effect.flatMap(boxOf(fixed), acquire)),
      leave: Effect.uninterruptible(Effect.flatMap(boxOf(fixed), release)),
      lend: Effect.uninterruptible(Effect.flatMap(boxOf(fixed), (box) => Effect.suspend(() => {
        let taken = false;
        const lease: Lease = {
          // Reclaimed once: a second reclaim of the same lease changes nothing.
          reclaim: Effect.suspend(() => {
            if (taken) return Effect.void;
            taken = true;
            return Effect.uninterruptible(Effect.andThen(Effect.sync(() => void box.lent--), sync(box)));
          }),
        };
        return Effect.as(Effect.andThen(Effect.sync(() => void box.lent++), Effect.andThen(sync(box), wake)), lease);
      }))),
      count: Effect.sync(running),
      held: Effect.sync(() => [...active].flatMap((box) => Array.from({ length: Math.max(0, box.holders - box.lent) }, () => box.owner)).sort()),
      quiet: Effect.suspend(() => {
        if (running() === 0) return Effect.void;
        const d = Deferred.makeUnsafe<void>();
        waiters.push(d);
        return Deferred.await(d);
      }),
      as: (o) => named(o),
    };
  };
  return named(undefined);
};

/** Counted work inside one process. */
export const BusyLive = Layer.sync(Busy, () => counting());

/** Counted work that also takes a token in the world's count for each box, so the world knows every process's work in flight (M8.07). */
export const BusyReporting: Layer.Layer<Busy, never, WorldCount> = Layer.effect(Busy, Effect.map(Effect.service(WorldCount), (world) => counting(world)));
