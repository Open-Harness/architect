import { Effect } from "effect";
import { TimerWakes, wakesByKind, type DurableTimer } from "@orthograph/language-effect";
import { WorldClock } from "#modules/clock/service.js";
import type { WorldTimersOptions, WorldTimersState, WorldWakes } from "./types.ts";
import { makeController } from "./internal/controller.ts";
import { makeCount } from "./internal/count.ts";
import { limitOf } from "./internal/limits.ts";
import { makeTable } from "./internal/table.ts";

const DEFAULT_QUIET_MS = 5_000;
/** The most timers one move fires at one instant (`ORTHO_FIRE_LIMIT`): a timer that sets itself again at that instant would never end. */
const DEFAULT_FIRE_LIMIT = 10_000;
/** A world closed for a reset opens again by itself after this long (real milliseconds). */
const REOPEN_AFTER_MS = 30_000;

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
    // The quiet bound is for a controller's moves. A real world has none, so nothing times a wake out there: a slow wake that was abandoned
    // could not be aborted and would run twice.
    const table = makeTable(sql, count, wakes, !real, real ? Number.POSITIVE_INFINITY : limitOf(env.ORTHO_QUIET_MS, DEFAULT_QUIET_MS));
    const fireLimit = limitOf(env.ORTHO_FIRE_LIMIT, DEFAULT_FIRE_LIMIT);
    // The world closes to new tokens and to writes while a reset wipes the databases. It opens again when told the wipe is done, or by
    // itself after a while, so a wipe that never finishes cannot keep it shut.
    let closedAt: number | undefined;
    const admit = () => {
      closedAt = undefined;
      count.admit();
    };
    const guard = () => {
      if (closedAt !== undefined && WorldClock.wall() - closedAt > REOPEN_AFTER_MS) admit();
    };
    /** A call that carries a token of a run that is over is refused before it touches the table. */
    const live = (token: string | undefined, what: string): void => {
      if (token !== undefined && !real && !count.has(token)) Effect.runSync(Effect.die(new Error(`${what} came from a run the world has reset`)));
    };
    // A wake that failed put its row back; the alarm tries again a second later rather than at once, in a loop.
    let retryAt: number | undefined;
    const touched = <A>(value: A): A => {
      changed();
      return value;
    };
    return {
      rpc: {
        // A real world counts nothing: its tokens are never taken, so they cannot be missed.
        countEnter: (owner) => {
          if (real) return "real";
          guard();
          // Closed for a reset: a request admitted now would lose its writes to the wipe. It is refused.
          if (count.closed()) return Effect.runSync(Effect.die(new Error(`${owner} was refused: the world is being reset`)));
          return count.enter(owner);
        },
        countSection: (id) => {
          if (real) return true;
          guard();
          return count.section(id);
        },
        countSectionEnd: (id) => (real ? undefined : count.sectionEnd(id)),
        countLeave: (id) => (real ? undefined : count.leave(id)),
        countName: (id, owner) => (real ? undefined : count.name(id, owner)),
        countHas: (id) => (real ? true : count.has(id)),
        timerAdd: (owner, name, at, holder, token) => {
          live(token, `a sleep for ${owner}`);
          return touched(table.add(owner, name, at, holder));
        },
        timerWait: (id) => Effect.runPromise(table.wait(id)),
        timerCancel: (id) => void touched(table.cancel(id)),
        timerSet: (at, owner, name, wake, token) => {
          live(token, `a durable timer for ${owner} ${name}`);
          return touched(table.set(at, owner, name, wake));
        },
        timerClear: (owner, name) => touched(table.clear(owner, name)),
        timersSleeping: () => table.sleeping(),
        timersDurable: () => table.durable(),
      },
      controller: makeController({ clock, table, count, limit: limitOf(env.ORTHO_QUIET_MS, DEFAULT_QUIET_MS), fireLimit }),
      nextAlarm: () => {
        const due = real ? table.earliest() : undefined;
        return due === undefined ? undefined : Math.max(due, retryAt ?? 0);
      },
      // Until nothing is due: a wake that set a timer already due, or a row that fell due while the wakes ran, is fired on this
      // alarm and not left for a reschedule that may find the world gone quiet.
      // Only a real world has an alarm for timers: a stepped or scaled one is fired by its controller, at its own instants.
      fireDue: () => {
        if (!real) return Effect.void;
        // At most `fireLimit` rows in one sweep: a wake that sets a due row under its own key would never end. Past it the sweep stops and
        // the alarm comes again a second later.
        let fired = 0;
        // Suspended, so each sweep reads the wall clock afresh: a row that fell due while the wakes ran is due at this sweep's cutoff.
        const sweep: Effect.Effect<void> = Effect.suspend(() => table.fire(WorldClock.wall(), undefined)).pipe(
          Effect.match({
            onSuccess: (rows) => { fired += rows.length; retryAt = undefined; },
            // A row whose wake failed stays pending, with its retry; `fire` has already gone on to the rows due after it.
            onFailure: () => { retryAt = WorldClock.wall() + 1_000; },
          }),
          Effect.flatMap(() => {
            if (fired > fireLimit) {
              retryAt = WorldClock.wall() + 1_000;
              return Effect.void;
            }
            return retryAt === undefined && table.earliest(WorldClock.wall()) !== undefined ? sweep : Effect.void;
          }),
        );
        return sweep;
      },
      held: () => count.held(),
      close: () => Effect.suspend(() => {
        if (real) return Effect.void;
        closedAt = WorldClock.wall();
        count.close();
        return count.drain(limitOf(env.ORTHO_QUIET_MS, DEFAULT_QUIET_MS));
      }),
      admit,
      reset: () => {
        table.reset();
        count.reset();
      },
    };
  },
};
