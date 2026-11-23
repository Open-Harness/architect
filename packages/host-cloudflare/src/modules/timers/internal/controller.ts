// The controller (K23 section 5): a move of a stepped world's clock is a walk from timer to timer. Wait until quiet, then
// find the earliest timer due at or before the target, move the instant to it, fire what is due there (by instant, then
// the order set, then owner), wait until quiet, and repeat; then move to the target and wait until quiet once more. A quiet
// wait that runs past its real-time limit fails as `NeverQuiet`, naming who is busy. If that is the first wait, nothing has moved.
import { Effect, Semaphore } from "effect";
import type { ClockState, ClockTimer, Controller } from "#modules/clock/types.js";
import { NeverQuiet, type Count } from "./count.ts";
import type { Table } from "./table.ts";

const iso = (millis: number) => new Date(millis).toISOString();

export interface ControllerOptions {
  readonly clock: ClockState;
  readonly table: Table;
  readonly count: Count;
  /** How long a quiet wait may take in real time, in milliseconds. */
  readonly limit: number;
  /** The most timers one move may fire at one instant before it gives up: a timer that sets itself again at the instant it fired at never ends. */
  readonly fireLimit: number;
}

export const makeController = ({ clock, table, count, limit, fireLimit }: ControllerOptions): Controller => {
  // One move at a time: a second waits its turn rather than walking the clock under the first.
  const one = Semaphore.makeUnsafe(1);
  return {
  settle: (plan) =>
    one.withPermits(1)(Effect.gen(function* () {
      const planned = plan();
      if (!planned.ok) return yield* Effect.fail({ _tag: "Refused" as const, status: planned.status, body: planned.body });
      const target = planned.target;
      // The walk belongs to the generation it began in: a reset ends it, and it must not move the clock the reset just put back.
      const born = count.generation();
      const reset = Effect.suspend(() => (count.generation() === born ? Effect.void : Effect.fail({ _tag: "WorldReset" as const })));
      const fired: Array<ClockTimer> = [];
      // How many have fired at the instant the walk is at: past the bound, something keeps registering timers due at it.
      let here = { at: Number.NaN, fired: 0 };
      yield* count.quiet(limit);
      yield* reset;
      // Settled means quiet and nothing due at the target, both at once: a request that registers an already-due timer while a
      // quiet wait is under way (a zero-length sleep at the new instant) is seen on the next turn, so the walk goes on until a
      // quiet wait ends with nothing due and the clock at the target.
      for (;;) {
        const next = table.earliest(target);
        if (next === undefined && clock.now() >= target) break;
        // A timer already past due fires where the world stands: the clock never goes back.
        const at = next === undefined ? target : Math.max(next, clock.now());
        yield* reset;
        clock.moveTo(iso(at));
        if (next !== undefined) {
          const batch = yield* table.fire(at, clock.source());
          yield* reset;
          for (const row of batch) {
            if (row.durable) fired.push({ due: iso(row.at), owner: row.owner, name: row.name });
          }
          here = { at, fired: here.at === at ? here.fired + batch.length : batch.length };
          if (here.fired > fireLimit) {
            // The clock stays where the walk reached (call 11); the owners still registering timers due now are named.
            const again = new Set([...table.rows().filter((r) => r.at <= Math.max(at, target)).map((r) => r.owner), ...batch.map((r) => r.owner)]);
            return yield* Effect.fail(new NeverQuiet({ busy: [...again].sort() }));
          }
        }
        yield* count.quiet(limit);
        yield* reset;
      }
      return { now: iso(clock.now()), fired };
    })),
  timers: () => table.rows().map((r) => ({ due: iso(r.at), owner: r.owner, name: r.name })),
  };
};
