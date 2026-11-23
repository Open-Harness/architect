import { Effect } from "effect";
import { TimerWakes, wakesByKind, type DurableTimer } from "@orthograph/language-effect";
import { WorldClock } from "#modules/clock/service.js";
import type { WorldTimersOptions, WorldTimersState, WorldWakes } from "./types.ts";
import { makeController } from "./internal/controller.ts";
import { makeCount } from "./internal/count.ts";
import { makeTable } from "./internal/table.ts";

const DEFAULT_QUIET_MS = 5_000;
/** The most timers one move fires at one instant (`ORTHO_FIRE_LIMIT`): a timer that sets itself again at that instant would never end. */
const DEFAULT_FIRE_LIMIT = 10_000;

/** The limit in real milliseconds; anything that is not a positive number is the default. */
const limitOf = (text: string | undefined, fallback = DEFAULT_QUIET_MS): number => {
  const n = Number(text);
  return text !== undefined && Number.isFinite(n) && n > 0 ? n : fallback;
};

export const WorldTimers = {
  /** The wake for a durable timer, by its kind: `wakesByKind` over `kinds`. A kind with no handler is a defect, which fails the wake. */
  route: (kinds: WorldWakes) => (timer: DurableTimer): Effect.Effect<void> =>
    Effect.flatMap(Effect.service(TimerWakes), (route) => route.wake(timer)).pipe(Effect.provide(wakesByKind(kinds))),

  /**
   * The timer table and the count of work in flight, over the world's own SQLite storage. A real world counts nothing and
   * fires its rows from an alarm; a stepped or scaled one is walked by the controller (`/_world/clock`).
   */
  state: (options: WorldTimersOptions): WorldTimersState => {
    const { sql, clock, env, wakes, changed } = options;
    const real = clock.kind === "real";
    const count = makeCount();
    const table = makeTable(sql, count, wakes, !real, limitOf(env.ORTHO_QUIET_MS));
    // A wake that failed put its row back; the alarm tries again a second later rather than at once, in a loop.
    let retryAt: number | undefined;
    const touched = <A>(value: A): A => {
      changed();
      return value;
    };
    return {
      rpc: {
        // A real world counts nothing: its tokens are never taken, so they cannot be missed.
        countEnter: (owner) => (real ? "real" : count.enter(owner)),
        countLeave: (id) => (real ? undefined : count.leave(id)),
        countName: (id, owner) => (real ? undefined : count.name(id, owner)),
        timerAdd: (owner, name, at, holder) => touched(table.add(owner, name, at, holder)),
        timerWait: (id) => Effect.runPromise(table.wait(id)),
        timerCancel: (id) => void touched(table.cancel(id)),
        timerSet: (at, owner, name, wake) => touched(table.set(at, owner, name, wake)),
        timerClear: (owner, name) => touched(table.clear(owner, name)),
        timersSleeping: () => table.sleeping(),
        timersDurable: () => table.durable(),
      },
      controller: makeController({ clock, table, count, limit: limitOf(env.ORTHO_QUIET_MS), fireLimit: limitOf(env.ORTHO_FIRE_LIMIT, DEFAULT_FIRE_LIMIT) }),
      nextAlarm: () => {
        const due = real ? table.earliest() : undefined;
        return due === undefined ? undefined : Math.max(due, retryAt ?? 0);
      },
      // Until nothing is due: a wake that set a timer already due, or a row that fell due while the wakes ran, is fired on this
      // alarm and not left for a reschedule that may find the world gone quiet.
      // Only a real world has an alarm for timers: a stepped or scaled one is fired by its controller, at its own instants.
      fireDue: () => {
        if (!real) return Effect.void;
        // Suspended, so each sweep reads the wall clock afresh: a row that fell due while the wakes ran is due at this sweep's cutoff.
        const sweep: Effect.Effect<void> = Effect.suspend(() => table.fire(WorldClock.wall(), undefined)).pipe(
          Effect.match({
            onSuccess: () => void (retryAt = undefined),
            onFailure: () => void (retryAt = WorldClock.wall() + 1_000),
          }),
          Effect.flatMap(() => (retryAt === undefined && table.earliest(WorldClock.wall()) !== undefined ? sweep : Effect.void)),
        );
        return sweep;
      },
      held: () => count.held(),
      reset: () => {
        table.reset();
        count.reset();
      },
    };
  },
};
