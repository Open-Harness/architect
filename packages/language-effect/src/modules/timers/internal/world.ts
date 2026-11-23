// `Timers` and `DurableTimers` on the world's table (M8.07), for a process that is not the world's Durable Object. A wait
// is a row in the world's table, not a fiber the world can see: the world fires it when its clock reaches the instant,
// after it has counted the sleeper, so the world is never quiet between the firing and the wake.
import { Clock, Context, Duration, Effect, Layer, Option } from "effect";
import { Busy, BusyOwner } from "#modules/work/types.js";
import { DurableTimers, TimerWakes, Timers, WorldTable } from "../types.ts";

export const TimersWorld: Layer.Layer<Timers | DurableTimers, never, Busy | WorldTable> = Layer.effectContext(
  Effect.gen(function* () {
    const busy = yield* Busy;
    const table = yield* WorldTable;
    const wakes = yield* Effect.serviceOption(TimerWakes);
    /** A row taken back: when it had not fired the sleeper takes its token again, and when it had the world already counted it. */
    const giveUp = (id: number) => Effect.flatMap(table.cancel(id), (removed) => (removed ? busy.enter : busy.adopt));
    const timers = Timers.of({
      // In-process only: the row is the world's, the work stays here and runs, counted, when the row fires.
      at: (at, owner, name, work) =>
        Effect.flatMap(table.add(owner, name, at, owner), (id) => {
          const mine = busy.as(owner);
          const run = Effect.andThen(table.wait(id), Effect.andThen(mine.adopt, Effect.ensuring(Effect.provideService(Effect.ignore(work), BusyOwner, owner), mine.leave)));
          return Effect.as(Effect.forkDetach(run), id);
        }),
      sleep: (owner, span) =>
        Effect.uninterruptibleMask((restore) => Effect.gen(function* () {
          const now = yield* Clock.currentTimeMillis;
          const holder = yield* Effect.service(BusyOwner);
          const id = yield* table.add(owner, "sleep", now + Duration.toMillis(span), holder);
          // The row is published before the token goes back, so the world never sees the process idle with no row.
          yield* busy.leave;
          yield* restore(table.wait(id)).pipe(Effect.onInterrupt(() => giveUp(id)));
          yield* busy.adopt;
        })),
      within: (owner, span, wait) =>
        Effect.uninterruptibleMask((restore) => Effect.gen(function* () {
          const now = yield* Clock.currentTimeMillis;
          const holder = yield* Effect.service(BusyOwner);
          const id = yield* table.add(owner, "deadline", now + Duration.toMillis(span), holder);
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
        Option.isNone(wakes) ? Effect.die(new Error(`no TimerWakes to fire ${owner} ${name}: provide the host's`)) : table.set(at, owner, name, wake),
      clear: table.clear,
      pending: table.durable,
    });
    return Context.make(Timers, timers).pipe(Context.add(DurableTimers, durable));
  }),
);
