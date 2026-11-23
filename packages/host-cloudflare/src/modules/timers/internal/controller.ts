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
  settle: (target) =>
    one.withPermits(1)(Effect.gen(function* () {
      const fired: Array<ClockTimer> = [];
      yield* count.quiet(limit);
      for (let next = table.earliest(target); next !== undefined; next = table.earliest(target)) {
        // A timer already past due fires where the world stands: the clock never goes back.
        const at = Math.max(next, clock.now());
        clock.moveTo(iso(at));
        for (const row of yield* table.fire(at, clock.source())) {
          if (row.durable) fired.push({ due: iso(row.at), owner: row.owner, name: row.name });
        }
        yield* count.quiet(limit);
      }
      if (clock.now() < target) {
        clock.moveTo(iso(target));
        yield* count.quiet(limit);
      }
      return { now: iso(clock.now()), fired };
    })),
  timers: () => table.rows().map((r) => ({ due: iso(r.at), owner: r.owner, name: r.name })),
  };
};
