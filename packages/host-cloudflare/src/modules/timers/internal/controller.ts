// The controller (K23 section 5): a move of a stepped world's clock is a walk from timer to timer. Wait until quiet, then
// find the earliest timer due at or before the target, move the instant to it, fire what is due there (by instant, then
// the order set, then owner), wait until quiet, and repeat; then move to the target and wait until quiet once more. A quiet
// wait that runs past its real-time limit fails as `NeverQuiet`, naming who is busy. If that is the first wait, nothing has moved.
import { Effect, Semaphore } from "effect";
import type { ClockState, ClockTimer, Controller } from "#modules/clock/types.js";
import type { Count } from "./count.ts";
import type { Table } from "./table.ts";

const iso = (millis: number) => new Date(millis).toISOString();

export interface ControllerOptions {
  readonly clock: ClockState;
  readonly table: Table;
  readonly count: Count;
  /** How long a quiet wait may take in real time, in milliseconds. */
  readonly limit: number;
}

export const makeController = ({ clock, table, count, limit }: ControllerOptions): Controller => {
  // One move at a time: a second waits its turn rather than walking the clock under the first.
  const one = Semaphore.makeUnsafe(1);
  return {
  settle: (plan) =>
    one.withPermits(1)(Effect.gen(function* () {
      const planned = plan();
      if (!planned.ok) return yield* Effect.fail({ _tag: "Refused" as const, status: planned.status, body: planned.body });
      const target = planned.target;
      const fired: Array<ClockTimer> = [];
      yield* count.quiet(limit);
      // Settled means quiet and nothing due at the target, both at once: a request that registers an already-due timer while a
      // quiet wait is under way (a zero-length sleep at the new instant) is seen on the next turn, so the walk goes on until a
      // quiet wait ends with nothing due and the clock at the target.
      for (;;) {
        const next = table.earliest(target);
        if (next === undefined && clock.now() >= target) break;
        // A timer already past due fires where the world stands: the clock never goes back.
        const at = next === undefined ? target : Math.max(next, clock.now());
        clock.moveTo(iso(at));
        if (next !== undefined) {
          for (const row of yield* table.fire(at, clock.source())) {
            if (row.durable) fired.push({ due: iso(row.at), owner: row.owner, name: row.name });
          }
        }
        yield* count.quiet(limit);
      }
      return { now: iso(clock.now()), fired };
    })),
  timers: () => table.rows().map((r) => ({ due: iso(r.at), owner: r.owner, name: r.name })),
  };
};
