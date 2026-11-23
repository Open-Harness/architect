import { Context, Deferred, Effect, Layer, Metric } from "effect";
import { Busy, BusyBoxRef, WorldCount, genOf, makeBox, type BusyBox, type BusyShape, type Lease } from "./types.ts";
import { runningId } from "./internal/fibers.ts";

type Report = {
  readonly enter: (owner: string) => Effect.Effect<string>;
  readonly leave: (id: string) => Effect.Effect<void>;
  readonly name?: ((id: string, owner: string) => Effect.Effect<void>) | undefined;
  readonly valid?: ((id: string) => Effect.Effect<boolean>) | undefined;
  readonly request?: Effect.Effect<BusyBox | undefined> | undefined;
  readonly section?: ((id: string) => Effect.Effect<boolean>) | undefined;
  readonly sectionEnd?: ((id: string) => Effect.Effect<void>) | undefined;
};

type FiberMetrics = Metric.FiberRuntimeMetricsService;

/** One process's count of the fibers it runs, and (when `world` is given) the token each box holds in the world's count. */
const counting = (world?: Report): BusyShape => {
  const active = new Set<BusyBox>();
  const shared = new Map<string, BusyBox>();
  let waiters: Array<Deferred.Deferred<void>> = [];
  /**
   * How many fibers of a box are working now: every fiber it holds (the one that took the token, and every fiber the runtime says started
   * under it, daemon or not, whether or not it forked others), less those that have lent the token out (a sleep) and those that are joining
   * (a combinator of ours waiting for its children). Conservative on purpose: an uncounted fiber that is still working corrupts a run without
   * a sound, and an over-count fails loudly, as `NeverQuiet` naming the owner.
   */
  const activity = (box: BusyBox): number => Math.max(0, box.holders - box.lent - box.joining.size);
  /** The fibers running now: a lent one is parked, not running. */
  const running = () => [...active].reduce((n, box) => n + activity(box), 0);
  // Waiters are let go from a fiber of their own, on the next turn: whoever lent a token out finishes recording its lease before any
  // waiter sees the process idle.
  const wake = Effect.suspend(() => {
    if (running() > 0) return Effect.void;
    return Effect.asVoid(Effect.provideService(Effect.forkDetach(Effect.andThen(Effect.yieldNow, Effect.suspend(() => {
      if (running() > 0) return Effect.void;
      const ready = waiters;
      waiters = [];
      return Effect.forEach(ready, (d) => Deferred.succeed(d, undefined), { discard: true });
    }))), BusyBoxRef, undefined));
  });
  /** Does the world hold this box's token now: a fiber of it runs, or (a request's box) it is between its fibers; never while every fiber is lent. */
  const wants = (box: BusyBox) => !box.stale && (activity(box) > 0 || (box.pinned && box.holders === 0 && box.lent === 0));
  /**
   * One step at a time per box (`box.gate`, which the entry's end takes too), so two fibers cannot take two tokens and the entry cannot
   * end between a take and its record. Telling the world takes time, and what the box wants can change meanwhile: it is read again
   * afterwards, and a token just taken that nothing needs now is given back, so none is left that nobody will release.
   */
  /**
   * Take a token for the box in the world. One of another generation than the box's first is of a run that came after (a reset since): the
   * box belongs to a run that is over, so the token is given back at once, the box is stale, and nothing is taken.
   */
  const mint = (box: BusyBox): Effect.Effect<string | undefined> =>
    Effect.gen(function* () {
      const id = yield* world!.enter(box.owner);
      if (box.gen === undefined) box.gen = genOf(id);
      if (box.gen === genOf(id)) return id;
      box.id = undefined;
      box.stale = true;
      yield* world!.leave(id);
      return undefined;
    });
  const sync = (box: BusyBox): Effect.Effect<void> =>
    box.gate.withPermits(1)(Effect.gen(function* () {
      if (world === undefined) return;
      if (wants(box) && box.id === undefined) box.id = yield* mint(box);
      // The box holds an id: the world must still know it. After a reset it does not, and the request would run unseen.
      else if (wants(box) && box.id !== undefined && world.valid !== undefined && !(yield* world.valid(box.id))) {
        // The world does not hold this token any more: a reset ended the run this work belongs to. It is not counted in the new one, and it may not write.
        box.id = undefined;
        box.stale = true;
      }
      if (!wants(box) && box.id !== undefined) {
        // Let whatever the fibers of the box are forking in this same turn (the other branches of an `all`, which are started one after the
        // other) start before deciding that nothing is running.
        yield* Effect.yieldNow;
        yield* Effect.yieldNow;
        if (wants(box)) return;
        const id = box.id;
        box.id = undefined;
        yield* world.leave(id);
      }
    }));
  const acquire = (box: BusyBox) => Effect.andThen(Effect.sync(() => { box.holders++; active.add(box); }), sync(box));
  const release = (box: BusyBox) =>
    Effect.andThen(Effect.sync(() => { box.holders--; if (box.holders <= 0) active.delete(box); }), Effect.andThen(sync(box), wake));
  /**
   * Every fiber a request forks while it runs under its box (`Effect.all` with concurrency, `race`, `fork`, a daemon, a timeout's children)
   * is a holder of that box for its whole life, whether or not its code ever asks: the runtime tells this hook when a fiber starts and ends
   * (`Metric.FiberRuntimeMetrics`, which each fiber reads from the context it inherits). So a sleeping branch cannot lend the token out from
   * under a branch that is still working, and a child that outlives its parent keeps the token until it ends.
   */
  const hook = (box: BusyBox, previous: FiberMetrics | undefined): FiberMetrics => ({
    recordFiberStart: (context) => {
      previous?.recordFiberStart(context);
      if (Context.get(context, BusyBoxRef) !== box) return;
      box.holders++;
      active.add(box);
      // A branch that starts after the others have lent the token out takes it back.
      if (box.id === undefined && !box.stale && box.holders > 1) Effect.runFork(Effect.ignore(sync(box)));
    },
    recordFiberEnd: (context, exit) => {
      previous?.recordFiberEnd(context, exit);
      if (Context.get(context, BusyBoxRef) !== box) return;
      box.holders = Math.max(0, box.holders - 1);
      if (box.holders <= 0) active.delete(box);
      // On the next turn, and in a fiber of its own, outside the request: telling the world takes time.
      Effect.runFork(Effect.ignore(Effect.andThen(Effect.yieldNow, Effect.andThen(sync(box), wake))));
    },
  });
  /** `work` under `box`: it, and every fiber it forks, are counted for the box. */
  const under = <A, E, R>(box: BusyBox, work: Effect.Effect<A, E, R>) =>
    Effect.suspend(() => {
      // This fiber is a root of the box's tree for as long as the work runs.
      const root = runningId();
      if (root !== undefined) box.rootIds.add(root);
      return Effect.ensuring(
        Effect.flatMap(Effect.service(Metric.FiberRuntimeMetrics), (previous) =>
          Effect.provideService(Effect.provideService(work, BusyBoxRef, box), Metric.FiberRuntimeMetrics, hook(box, previous))),
        // The root is done with its work: whatever it forked and left running is working on its own, and the root is no longer waiting for it.
        Effect.sync(() => { if (root !== undefined) box.rootIds.delete(root); }),
      );
    });
  /** The box this fiber runs under, or its request's, when there is one. */
  const requestBox: Effect.Effect<BusyBox | undefined> = Effect.gen(function* () {
    const current = yield* Effect.service(BusyBoxRef);
    return current ?? (world?.request === undefined ? undefined : yield* world.request);
  });
  /** Interrupts a request whose token the world no longer holds (a reset since); nothing outside a request. */
  const alive: Effect.Effect<void> = Effect.gen(function* () {
    const box = yield* requestBox;
    if (box?.stale === true) return yield* Effect.interrupt;
    if (box?.id === undefined || world?.valid === undefined) return;
    if (!(yield* world.valid(box.id))) {
      box.stale = true;
      box.id = undefined;
      return yield* Effect.interrupt;
    }
  });
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
      // Already inside a box, the fiber is counted (the one that took the token, or a child the runtime told us about): nothing more to take.
      counted: (work) => Effect.flatMap(Effect.service(BusyBoxRef), (current) =>
        current !== undefined ? work : Effect.flatMap(boxOf(fixed), (box) =>
          Effect.uninterruptibleMask((restore) => Effect.andThen(acquire(box), Effect.ensuring(restore(under(box, work)), release(box)))))),
      // Its own token, taken before this returns and so before the caller's can end. A request the world no longer holds cannot start one.
      // The fiber is forked outside the parent's box (it is not the parent's work) and runs under its own.
      spawn: (work) => Effect.gen(function* () {
        yield* alive;
        const box = own();
        yield* Effect.uninterruptibleMask((restore) =>
          Effect.andThen(acquire(box), Effect.provideService(Effect.forkDetach(Effect.ensuring(restore(under(box, work)), release(box))), BusyBoxRef, undefined)));
      }),
      enter: Effect.uninterruptible(Effect.flatMap(boxOf(fixed), acquire)),
      leave: Effect.uninterruptible(Effect.flatMap(boxOf(fixed), release)),
      lend: Effect.uninterruptible(Effect.flatMap(boxOf(fixed), (box) => Effect.suspend(() => {
        let taken = false;
        const lease: Lease = {
          // Reclaimed once: a second reclaim of the same lease changes nothing.
          reclaim: Effect.suspend(() => {
            if (taken) return Effect.void;
            taken = true;
            return Effect.uninterruptible(Effect.andThen(Effect.sync(() => { box.lent--; }), sync(box)));
          }),
        };
        return Effect.as(Effect.andThen(Effect.sync(() => { box.lent++; }), Effect.andThen(sync(box), wake)), lease);
      }))),
      joining: (work) => Effect.flatMap(requestBox, (box) => {
        const id = runningId();
        if (box === undefined || id === undefined) return work;
        return Effect.uninterruptibleMask((restore) =>
          Effect.andThen(
            // Marked, and not synced: the children are not forked yet, and the token is let go only when one of them lends it out or ends.
            Effect.sync(() => void box.joining.add(id)),
            Effect.ensuring(restore(work), Effect.andThen(Effect.sync(() => void box.joining.delete(id)), sync(box)))));
      }),
      fenced: (work) => Effect.gen(function* () {
        const box = yield* requestBox;
        if (box?.stale === true) return yield* Effect.interrupt;
        if (world?.section === undefined || box === undefined) return yield* work;
        return yield* Effect.uninterruptibleMask((restore) =>
          Effect.gen(function* () {
            // A box whose token is lent out writes under a token of its own for the length of the section, never unfenced: of its own run, or refused.
            const held = box.id;
            const id = held ?? (yield* mint(box));
            if (id === undefined) return yield* restore(Effect.interrupt);
            const done = held === undefined ? world.leave(id) : Effect.void;
            const open = yield* world.section!(id);
            if (!open) {
              // The world no longer holds this request's token: it belongs to a run that is over, and it writes nothing.
              if (held !== undefined) { box.stale = true; box.id = undefined; }
              yield* done;
              return yield* restore(Effect.interrupt);
            }
            return yield* Effect.ensuring(restore(work), Effect.andThen(world.sectionEnd === undefined ? Effect.void : world.sectionEnd(id), done));
          }));
      }),
      count: Effect.sync(running),
      held: Effect.sync(() => [...active].flatMap((box) => Array.from({ length: activity(box) }, () => box.owner)).sort()),
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
