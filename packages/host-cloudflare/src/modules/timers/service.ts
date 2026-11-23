import { Effect } from "effect";
import { WorldClock } from "#modules/clock/service.js";
import type { WorldTimersOptions, WorldTimersState } from "./types.ts";
import { makeController } from "./internal/controller.ts";
import { makeCount } from "./internal/count.ts";
import { makeTable } from "./internal/table.ts";

const DEFAULT_QUIET_MS = 5_000;

/** The limit in real milliseconds; anything that is not a positive number is the default. */
const limitOf = (text: string | undefined): number => {
  const n = Number(text);
  return text !== undefined && Number.isFinite(n) && n > 0 ? n : DEFAULT_QUIET_MS;
};

export const WorldTimers = {
  /**
   * The timer table and the count of work in flight, over the world's own SQLite storage. A real world counts nothing and
   * fires its rows from an alarm; a stepped or scaled one is walked by the controller (`/_world/clock`).
   */
  state: (options: WorldTimersOptions): WorldTimersState => {
    const { sql, clock, env, wakes, changed } = options;
    const real = clock.kind === "real";
    const count = makeCount();
    const table = makeTable(sql, count, wakes, !real);
    // A wake that failed put its row back; the alarm tries again a second later rather than at once, in a loop.
    let retryAt: number | undefined;
    const touched = <A>(value: A): A => {
      changed();
      return value;
    };
    return {
      rpc: {
        countEnter: (owner) => (real ? undefined : count.enter(owner)),
        countLeave: (owner) => (real ? undefined : count.leave(owner)),
        timerAdd: (owner, name, at, holder) => touched(table.add(owner, name, at, holder)),
        timerWait: (id) => Effect.runPromise(table.wait(id)),
        timerCancel: (id) => touched(table.cancel(id)),
        timerSet: (at, owner, name, wake) => touched(table.set(at, owner, name, wake)),
        timerClear: (owner, name) => touched(table.clear(owner, name)),
        timersSleeping: () => table.sleeping(),
        timersDurable: () => table.durable(),
      },
      controller: makeController({ clock, table, count, limit: limitOf(env.ORTHO_QUIET_MS) }),
      nextAlarm: () => {
        const due = real ? table.earliest() : undefined;
        return due === undefined ? undefined : Math.max(due, retryAt ?? 0);
      },
      fireDue: () =>
        table.fire(WorldClock.wall(), undefined).pipe(
          Effect.match({
            onSuccess: () => void (retryAt = undefined),
            onFailure: () => void (retryAt = WorldClock.wall() + 1_000),
          }),
        ),
      reset: () => table.reset(),
    };
  },
};
