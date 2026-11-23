// `Timers` and `DurableTimers` on the world's table (M8.07), for a process that is not the world's Durable Object. A wait is a row in
// the world's table, not a fiber the world can see: the world fires it when its clock reaches the instant, holding a token of its own
// for the sleeper until the sleeper has taken its token back (`reclaim`) and acknowledged (`cancel`), so the world is never quiet
// between the firing and the wake.
import { Clock, Context, Duration, Effect, Layer, Option } from "effect";
import { Busy } from "#modules/work/types.js";
import { DurableTimers, TimerWakes, Timers, WorldTable } from "../types.ts";

/** The furthest instant a `Date` holds either side of the epoch: the world's clock cannot hold more, so nothing past it is set. */
const MAX_INSTANT = 8.64e15;

/** An instant the world can hold, or a defect naming what asked for it (`Duration.infinity`, `NaN`, a span past the range). */
const instantOf = (at: number, what: string): Effect.Effect<number> =>
  Number.isFinite(at) && Math.abs(at) <= MAX_INSTANT ? Effect.succeed(at) : Effect.die(new Error(`${what} needs a finite instant within a Date's range, not ${at}`));

export const TimersWorld: Layer.Layer<Timers | DurableTimers, never, Busy | WorldTable> = Layer.effectContext(
  Effect.gen(function* () {
    const busy = yield* Busy;
    const table = yield* WorldTable;
    const wakes = yield* Effect.serviceOption(TimerWakes);
    /** Back to work: the sleeper takes its own token again first, and only then does the world let go of the one it held for it. */
    const resume = (lease: { readonly reclaim: Effect.Effect<void> }, id: number) => Effect.andThen(lease.reclaim, table.cancel(id));
    const timers = Timers.of({
      // The row and the fiber that owns it are one uninterruptible step: an interrupt while the world is being told waits for it,
      // so a row the world holds always has a waiter to take the token the world holds for it. The waiter gives the row up itself
      // if it is interrupted while it waits.
      at: (at, owner, name, work) =>
        Effect.uninterruptibleMask((restore) =>
          Effect.flatMap(Effect.andThen(instantOf(at, `a timer for ${owner} ${name}`), table.add(owner, name, at, owner)), (id) => {
            const run = restore(table.wait(id)).pipe(
              Effect.onInterrupt(() => table.cancel(id)),
              // The work gets a token of its own (taken before `spawn` returns) before the world lets go of the one it held for the row.
              Effect.andThen(busy.as(owner).spawn(Effect.andThen(table.cancel(id), Effect.ignore(work)))),
            );
            return Effect.as(Effect.forkDetach(run), id);
          })),
      sleep: (owner, span) =>
        Effect.uninterruptibleMask((restore) => Effect.gen(function* () {
          const now = yield* Clock.currentTimeMillis;
          const at = yield* instantOf(now + Duration.toMillis(span), `a sleep for ${owner}`);
          // The row is published before the token is lent out, so the world never sees the process idle with no row.
          const id = yield* table.add(owner, "sleep", at, owner);
          const lease = yield* busy.lend;
          yield* restore(table.wait(id)).pipe(Effect.onInterrupt(() => resume(lease, id)));
          yield* resume(lease, id);
        })),
      within: (owner, span, wait) =>
        Effect.uninterruptibleMask((restore) => Effect.gen(function* () {
          const now = yield* Clock.currentTimeMillis;
          const at = yield* instantOf(now + Duration.toMillis(span), `a deadline for ${owner}`);
          const id = yield* table.add(owner, "deadline", at, owner);
          const lease = yield* busy.lend;
          return yield* restore(Effect.raceFirst(
            Effect.map(wait, Option.some),
            table.wait(id).pipe(Effect.as(Option.none())),
          )).pipe(Effect.ensuring(resume(lease, id)));
        })),
      due: () => Effect.succeed(undefined),
      fire: () => Effect.succeed([]),
      pending: table.sleeping,
    });
    // Rule 6 of M8-timers-shape: nothing could fire a durable timer where no `TimerWakes` is provided, so setting one is a defect.
    const durable = DurableTimers.of({
      set: (at, owner, name, wake) =>
        Option.isNone(wakes)
          ? Effect.die(new Error(`no TimerWakes to fire ${owner} ${name}: provide the host's`))
          : Effect.andThen(instantOf(at, `a durable timer for ${owner} ${name}`), table.set(at, owner, name, wake)),
      clear: table.clear,
      pending: table.durable,
    });
    return Context.make(Timers, timers).pipe(Context.add(DurableTimers, durable));
  }),
);
