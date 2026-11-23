// `Timers` and `DurableTimers` on the world's table (M8.07), for a process that is not the world's Durable Object. A wait
// is a row in the world's table, not a fiber the world can see: the world fires it when its clock reaches the instant,
// after it has counted the sleeper, so the world is never quiet between the firing and the wake.
import { Clock, Context, Duration, Effect, Layer, Option } from "effect";
import { Busy, BusyOwner } from "#modules/work/types.js";
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
    /** A row taken back: when it had not fired the sleeper takes its token again, and when it had the world already counted it. */
    const giveUp = (id: number) => Effect.flatMap(table.cancel(id), (removed) => (removed ? busy.enter : busy.adopt));
    const timers = Timers.of({
      // In-process only: the row is the world's, the work stays here and runs, counted, when the row fires.
      // The row and the fiber that owns it are one uninterruptible step: an interrupt while the world is being told waits for it,
      // so a row the world holds always has a waiter to adopt the token the world counts when it fires. The waiter itself
      // gives the row up (or the token the world counted for it) if it is interrupted while it waits.
      at: (at, owner, name, work) =>
        Effect.uninterruptibleMask((restore) =>
          Effect.flatMap(Effect.andThen(instantOf(at, `a timer for ${owner} ${name}`), table.add(owner, name, at, owner)), (id) => {
            const mine = busy.as(owner);
            const woken = restore(table.wait(id)).pipe(
              Effect.onInterrupt(() => Effect.flatMap(table.cancel(id), (removed) => (removed ? Effect.void : Effect.andThen(mine.adopt, mine.leave)))),
            );
            const run = Effect.andThen(woken, Effect.andThen(mine.adopt, Effect.ensuring(restore(Effect.provideService(Effect.ignore(work), BusyOwner, owner)), mine.leave)));
            return Effect.as(Effect.forkDetach(run), id);
          })),
      sleep: (owner, span) =>
        Effect.uninterruptibleMask((restore) => Effect.gen(function* () {
          const now = yield* Clock.currentTimeMillis;
          const holder = yield* Effect.service(BusyOwner);
          const id = yield* Effect.andThen(instantOf(now + Duration.toMillis(span), `a sleep for ${owner}`), table.add(owner, "sleep", now + Duration.toMillis(span), holder));
          // The row is published before the token goes back, so the world never sees the process idle with no row.
          yield* busy.leave;
          yield* restore(table.wait(id)).pipe(Effect.onInterrupt(() => giveUp(id)));
          yield* busy.adopt;
        })),
      within: (owner, span, wait) =>
        Effect.uninterruptibleMask((restore) => Effect.gen(function* () {
          const now = yield* Clock.currentTimeMillis;
          const holder = yield* Effect.service(BusyOwner);
          const id = yield* Effect.andThen(instantOf(now + Duration.toMillis(span), `a deadline for ${owner}`), table.add(owner, "deadline", now + Duration.toMillis(span), holder));
          yield* busy.leave;
          return yield* restore(Effect.raceFirst(
            Effect.map(wait, Option.some),
            table.wait(id).pipe(Effect.as(Option.none())),
          )).pipe(Effect.ensuring(giveUp(id)));
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
