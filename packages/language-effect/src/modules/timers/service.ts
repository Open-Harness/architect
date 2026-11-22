import { Clock, Context, Deferred, Duration, Effect, Layer, Option } from "effect";
import { Busy } from "#modules/work/types.js";
import { DurableTimers, TimerWakes, Timers, type DurableTimer, type Timer, type Wake } from "./types.ts";

const timerOf = (t: Timer): Timer => ({ id: t.id, at: t.at, owner: t.owner, name: t.name });
const durableOf = (t: DurableTimer): DurableTimer => ({ ...timerOf(t), wake: t.wake });

type Row = Timer & { readonly run: Effect.Effect<void>; readonly wake?: Wake };

/**
 * Timers for code that runs on a device or in a plain process, with no world to drive its clock: `sleep` waits on the
 * real clock. A timer to fire later (`at`) needs a world and is refused as a defect, so a device entry can wait but never
 * schedule.
 */
export const TimersLive = Layer.succeed(Timers, Timers.of({
  at: () => Effect.die(new Error("a device has no world to fire a timer: it can wait, not schedule")),
  sleep: (_owner, span) => Effect.flatMap(Clock.Clock, (clock) => clock.sleep(Duration.fromInputUnsafe(span))),
  due: () => Effect.succeed(undefined),
  fire: () => Effect.succeed([]),
  pending: Effect.succeed([]),
}));

/**
 * Timers kept in memory, fired by whoever drives the world's clock: `Timers` and `DurableTimers` over one table, so a
 * sleep and a durable timer due at one instant fire in the order they were set. A durable timer fires through the
 * host's `TimerWakes`; with none provided, setting one is a defect. A world's Durable Object keeps the table (M8.07).
 */
export const TimersMemory: Layer.Layer<Timers | DurableTimers, never, Busy> = Layer.effectContext(
  Effect.gen(function* () {
    const busy = yield* Busy;
    const wakes = yield* Effect.serviceOption(TimerWakes);
    const table: Array<Row> = [];
    let next = 1;
    const add = (at: number, owner: string, name: string, run: Effect.Effect<void>, wake?: Wake) =>
      Effect.sync(() => {
        const id = next++;
        table.push(wake === undefined ? { id, at, owner, name, run } : { id, at, owner, name, run, wake });
        return id;
      });
    const remove = (id: number) => {
      const pending = table.findIndex((timer) => timer.id === id);
      if (pending === -1) return false;
      table.splice(pending, 1);
      return true;
    };
    const durable = DurableTimers.of({
      set: (at, owner, name, wake) => Effect.suspend(() => {
        if (!Number.isFinite(at)) return Effect.die(new Error(`a durable timer for ${owner} ${name} needs a finite instant, not ${at}`));
        if (Option.isNone(wakes)) return Effect.die(new Error(`no TimerWakes to fire ${owner} ${name}: provide the host's`));
        const host = wakes.value;
        // One synchronous step: the pending check, the id and the insert, so two setters of one (owner, name) make one row.
        const pending = table.find((t) => t.wake !== undefined && t.owner === owner && t.name === name);
        if (pending !== undefined) return Effect.succeed(pending.id);
        const id = next++;
        const timer: DurableTimer = { id, at, owner, name, wake };
        // A wake that fails puts its row back and fails the firing, so the driver sees it and nothing is lost.
        const run = busy.counted(host.wake(timer)).pipe(Effect.onError(() => Effect.sync(() => void table.push(row))));
        const row: Row = { ...timer, run };
        table.push(row);
        return Effect.succeed(id);
      }),
      clear: (owner, name) => Effect.sync(() => {
        const pending = table.find((t) => t.wake !== undefined && t.owner === owner && t.name === name);
        return pending === undefined ? false : remove(pending.id);
      }),
      pending: Effect.sync(() =>
        table.flatMap((t) => (t.wake === undefined ? [] : [durableOf({ ...t, wake: t.wake })])).sort((a, b) => a.at - b.at || a.id - b.id)),
    });
    const timers = Timers.of({
      at: (at, owner, name, work) => add(at, owner, name, busy.spawn(Effect.ignore(work))),
      sleep: (owner, span) =>
        Effect.uninterruptibleMask((restore) => Effect.gen(function* () {
          const now = yield* Clock.currentTimeMillis;
          const woken = yield* Deferred.make<void>();
          // The timer takes a token for the sleeper before waking it, so a woken fiber is never uncounted.
          const id = yield* add(now + Duration.toMillis(span), owner, "sleep", Effect.andThen(busy.enter, Deferred.succeed(woken, undefined)));
          yield* busy.leave;
          yield* restore(Deferred.await(woken)).pipe(Effect.onInterrupt(() => Effect.gen(function* () {
            if (remove(id)) yield* busy.enter;
            // A firing timer has already claimed ownership of the wakeup.
            else yield* Deferred.await(woken);
          })));
        })),
      within: (owner, span, wait) =>
        Effect.uninterruptibleMask((restore) => Effect.gen(function* () {
          const now = yield* Clock.currentTimeMillis;
          const ended = yield* Deferred.make<void>();
          const counted = yield* Deferred.make<void>();
          let claimed = false;
          const resume = Effect.suspend(() => {
            if (claimed) return Deferred.await(counted);
            claimed = true;
            return busy.enter.pipe(Effect.andThen(Deferred.succeed(counted, undefined)), Effect.asVoid);
          });
          const id = yield* add(now + Duration.toMillis(span), owner, "deadline", Effect.andThen(resume, Deferred.succeed(ended, undefined)));
          // Publish the deadline before releasing our work token so the world can advance it.
          yield* busy.leave;
          return yield* restore(Effect.raceFirst(
            Effect.map(wait, Option.some),
            Deferred.await(ended).pipe(Effect.as(Option.none())),
          )).pipe(Effect.ensuring(Effect.sync(() => remove(id)).pipe(Effect.andThen(resume))));
        })),
      due: (target) =>
        Effect.sync(() => table.reduce<number | undefined>((best, t) => (t.at <= target && (best === undefined || t.at < best) ? t.at : best), undefined)),
      fire: (at) =>
        Effect.gen(function* () {
          const hit = table.filter((t) => t.at === at).sort((a, b) => a.id - b.id);
          const fired: Array<Timer> = [];
          // Each row leaves the table only as its own firing begins, so a firing that fails leaves the rest pending.
          for (const t of hit) {
            const row = table.indexOf(t);
            if (row === -1) continue;
            table.splice(row, 1);
            yield* t.run;
            fired.push(timerOf(t));
          }
          return fired;
        }),
      pending: Effect.sync(() => table.map(timerOf).sort((a, b) => a.at - b.at || a.id - b.id)),
    });
    return Context.make(Timers, timers).pipe(Context.add(DurableTimers, durable));
  }),
);

/** The host's `TimerWakes`, one handler per wake kind. A kind with no handler is a defect: nothing set it legally. */
export const wakesByKind = (handlers: Readonly<Record<string, (timer: DurableTimer) => Effect.Effect<void>>>) =>
  Layer.succeed(TimerWakes, TimerWakes.of({
    wake: (timer) => {
      const handler = Object.hasOwn(handlers, timer.wake.kind) ? handlers[timer.wake.kind] : undefined;
      return handler === undefined ? Effect.die(new Error(`no wake handler for kind ${timer.wake.kind}`)) : handler(timer);
    },
  }));
