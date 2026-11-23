// The world's timer table (M8.07): one table in the world's Durable Object, so a sleep and a durable timer share one order.
// A sleeping row lives as long as the process that parked it, which is why it is dropped when the object starts afresh;
// a durable row outlives it. Firing a row counts its owner first and only then hands it back, so the world is never quiet
// between the firing and the code that wakes.
import { Data, Deferred, Duration, Effect, Exit, Fiber, Option } from "effect";
import type { DurableTimer, Wake } from "@orthograph/language-effect";
import type { ClockSource } from "#modules/clock/types.js";
import { NeverQuiet, type Count } from "./count.ts";

export interface Row {
  readonly id: number;
  readonly at: number;
  readonly owner: string;
  readonly name: string;
}

/** A durable timer's wake failed: its row is back in the table, and the step that fired it fails, naming it. */
export class WakeFailed extends Data.TaggedError("WakeFailed")<{ readonly owner: string; readonly name: string; readonly message: string }> {}

export interface Table {
  readonly add: (owner: string, name: string, at: number, holder: string) => number;
  /** Resolves when the row fires, with the source of the instant it fired at; the world holds a token for the sleeper by then. */
  readonly wait: (id: number) => Effect.Effect<ClockSource | undefined>;
  /** The sleeper is back or gave up: the row is taken back if it has not fired, and the token the world held for it is released. Idempotent. */
  readonly cancel: (id: number) => void;
  readonly set: (at: number, owner: string, name: string, wake: Wake) => number;
  readonly clear: (owner: string, name: string) => boolean;
  /** Every row, in firing order: by instant, then the order set. */
  readonly rows: () => ReadonlyArray<Row>;
  readonly durable: () => ReadonlyArray<DurableTimer>;
  readonly sleeping: () => ReadonlyArray<Row>;
  /** The earliest instant a row is due at, at or before `target` when one is given. */
  readonly earliest: (target?: number) => number | undefined;
  /** Fire every row due at or before `at`, in order. A durable row goes to `wakes`; with none, its firing fails. */
  readonly fire: (at: number, source: ClockSource | undefined) => Effect.Effect<ReadonlyArray<Row & { readonly durable: boolean }>, WakeFailed | NeverQuiet>;
  /** Forget every row: the warm reset between runs. */
  readonly reset: () => void;
}

interface Stored extends Record<string, SqlStorageValue> {
  readonly id: number;
  readonly at: number;
  readonly owner: string;
  readonly name: string;
  readonly holder: string | null;
  readonly wake: string | null;
}

/** `firing` marks a durable row whose wake has started and not yet returned: it is out of the pending set but not gone, so a crash cannot lose it. */
const SCHEMA = "CREATE TABLE IF NOT EXISTS timers (id INTEGER PRIMARY KEY AUTOINCREMENT, at INTEGER NOT NULL, owner TEXT NOT NULL, name TEXT NOT NULL, holder TEXT, wake TEXT, firing INTEGER NOT NULL DEFAULT 0)";

/** The furthest instant a `Date` can hold either side of the epoch, in milliseconds: nothing the world's clock cannot hold goes in the table. */
const MAX_INSTANT = 8.64e15;

/** An instant the table and the clock can hold; anything else is refused (a defect to the caller) before it reaches SQL. */
const instantOf = (at: number, what: string): number =>
  Number.isFinite(at) && Math.abs(at) <= MAX_INSTANT ? at : Effect.runSync(Effect.die(new Error(`${what} needs a finite instant within a Date's range, not ${at}`)));

const rowOf = (r: Stored): Row => ({ id: r.id, at: r.at, owner: r.owner, name: r.name });

export const makeTable = (
  sql: SqlStorage,
  count: Count,
  wakes: ((timer: DurableTimer) => Effect.Effect<void>) | undefined,
  /** A real world counts nothing: nobody waits for it to be quiet. */
  counting: boolean,
  /** How long a wake may take in real milliseconds before the firing is abandoned (its row recoverable, its token released). */
  wakeLimit = Number.POSITIVE_INFINITY,
): Table => {
  sql.exec(SCHEMA);
  if (!sql.exec<{ name: string }>("PRAGMA table_info(timers)").toArray().some((c) => c.name === "firing")) sql.exec("ALTER TABLE timers ADD COLUMN firing INTEGER NOT NULL DEFAULT 0");
  // A sleeping row belongs to a process that is gone with this object's memory.
  sql.exec("DELETE FROM timers WHERE wake IS NULL");
  // A wake the world died in the middle of is not lost (at least once, M8-timers-shape): its row is pending again, due as it was,
  // unless a pending row now has the same (owner, name), which wins. Of several firing rows for one key the newest wins.
  sql.exec("UPDATE timers SET firing = 0 WHERE firing = 1 AND NOT EXISTS (SELECT 1 FROM timers p WHERE p.firing = 0 AND p.wake IS NOT NULL AND p.owner = timers.owner AND p.name = timers.name)");
  sql.exec("DELETE FROM timers WHERE firing = 1");
  sql.exec("DELETE FROM timers WHERE wake IS NOT NULL AND firing = 0 AND id < (SELECT MAX(t.id) FROM timers t WHERE t.wake IS NOT NULL AND t.firing = 0 AND t.owner = timers.owner AND t.name = timers.name)");
  const waiting = new Map<number, Deferred.Deferred<ClockSource | undefined>>();
  /** The token the world holds for a sleeper from its row firing until the sleeper acknowledges (`cancel`). */
  const woken = new Map<number, string>();
  /** The pending rows (not firing) that meet `where`, in firing order. */
  const select = (where: string, ...args: Array<SqlStorageValue>) =>
    sql.exec<Stored>(`SELECT id, at, owner, name, holder, wake FROM timers WHERE firing = 0${where === "" ? "" : ` AND ${where.replace(/^WHERE /, "")}`} ORDER BY at, id, owner`, ...args).toArray();
  const durableOf = (r: Stored): DurableTimer => ({ ...rowOf(r), wake: JSON.parse(r.wake!) as Wake });
  const insert = (r: { readonly at: number; readonly owner: string; readonly name: string; readonly holder: string | null; readonly wake: string | null }) =>
    sql.exec<{ id: number }>("INSERT INTO timers (at, owner, name, holder, wake) VALUES (?, ?, ?, ?, ?) RETURNING id", r.at, r.owner, r.name, r.holder, r.wake).one().id;
  /** A sleeping row, taken out for good: false when it was already taken. */
  const forget = (id: number) => sql.exec("DELETE FROM timers WHERE id = ? AND wake IS NULL", id).rowsWritten > 0;
  /** A durable row, out of the pending set and into `firing`, in one step: false when something else already took it. */
  const take = (id: number) => sql.exec("UPDATE timers SET firing = 1 WHERE id = ? AND firing = 0", id).rowsWritten > 0;
  /** The wake has returned: the record goes. */
  const done = (id: number) => void sql.exec("DELETE FROM timers WHERE id = ?", id);
  /** The wake did not finish: pending again, unless the wake already set a replacement under the same (owner, name), which stands alone. */
  const restore = (r: Stored) => {
    // Each arrow is one SQL step, and the two run with nothing in between (this object runs one thing at a time): gone because a
    // replacement stands, else pending again. A row a reset already forgot is not brought back (its id is never reused).
    const replaced = sql.exec("DELETE FROM timers WHERE id = ? AND firing = 1 AND EXISTS (SELECT 1 FROM timers p WHERE p.firing = 0 AND p.wake IS NOT NULL AND p.owner = ? AND p.name = ?)", r.id, r.owner, r.name).rowsWritten > 0;
    if (!replaced) sql.exec("UPDATE timers SET firing = 0 WHERE id = ? AND firing = 1", r.id);
  };
  /** Give a token back by its id (the world's count ignores one of an older generation, or one already released). */
  const give = (token: string | undefined) => { if (token !== undefined) count.leave(token); };
  const bounded = <A, E>(wait: Effect.Effect<A, E>) =>
    Number.isFinite(wakeLimit) ? Effect.timeoutOption(wait, Duration.millis(wakeLimit)) : Effect.map(wait, Option.some);

  /**
   * One firing. Taking the row out, counting what it wakes and starting the wake are one uninterruptible step. The wake runs in a fiber
   * of its own and the firing waits for it for at most `wakeLimit` real milliseconds: a wake that fails, is interrupted or never
   * acknowledges puts its row back to pending (unless a replacement stands) and gives its token back, and the step fails naming it.
   * False when an earlier wake in the walk already took the row.
   */
  const fireOne = (r: Stored, source: ClockSource | undefined): Effect.Effect<boolean, WakeFailed | NeverQuiet> =>
    Effect.uninterruptibleMask((restoreInterrupt) => Effect.suspend(() => {
      if (r.wake === null) {
        // A sleeper is an in-memory wait: it lives and dies with the process that parked it (and a row is dropped when the object starts),
        // so it needs no record of a firing in progress. The world holds a token for it from here until it acknowledges.
        if (!forget(r.id)) return Effect.succeed(false);
        const gate = waiting.get(r.id);
        if (gate !== undefined) {
          if (counting) woken.set(r.id, count.enter(r.holder ?? r.owner));
          Deferred.doneUnsafe(gate, Effect.succeed(source));
        }
        return Effect.succeed(true);
      }
      const timer = durableOf(r);
      if (wakes === undefined) {
        return Effect.fail(new WakeFailed({ owner: r.owner, name: r.name, message: `no wake handler routes kind ${timer.wake.kind} in this world` }));
      }
      if (!take(r.id)) return Effect.succeed(false);
      const token = counting ? count.enter(r.owner) : undefined;
      return Effect.gen(function* () {
        const wake = yield* Effect.forkDetach(restoreInterrupt(wakes(timer)));
        // Abandoned: the row goes back to pending now, and the wake, which may never return, is told to stop without waiting for it.
        const abandon = Effect.suspend(() => {
          restore(r);
          return Effect.asVoid(Effect.forkDetach(Fiber.interrupt(wake)));
        });
        const ended = yield* restoreInterrupt(bounded(Fiber.await(wake))).pipe(Effect.onInterrupt(() => abandon));
        if (Option.isNone(ended)) {
          yield* abandon;
          return yield* Effect.fail(new NeverQuiet({ busy: [r.owner] }));
        }
        if (Exit.isSuccess(ended.value)) {
          done(r.id);
          return true;
        }
        restore(r);
        return yield* Effect.fail(new WakeFailed({ owner: r.owner, name: r.name, message: String(ended.value.cause) }));
      }).pipe(Effect.ensuring(Effect.sync(() => give(token))));
    }));

  return {
    add: (owner, name, at, holder) => {
      const id = insert({ at: instantOf(at, `a sleep for ${owner} ${name}`), owner, name, holder, wake: null });
      waiting.set(id, Deferred.makeUnsafe<ClockSource | undefined>());
      return id;
    },
    // A row the world no longer knows (a reset forgot it) wakes its waiter rather than leaving it hanging.
    wait: (id) => {
      const gate = waiting.get(id);
      return gate === undefined ? Effect.succeed(undefined) : Deferred.await(gate);
    },
    cancel: (id) => {
      const gate = waiting.get(id);
      waiting.delete(id);
      forget(id);
      // The token the world held for the sleeper goes back; one a reset already forgot is ignored by its id.
      give(woken.get(id));
      woken.delete(id);
      // A wait still pending on a row that was taken back is let go, not left as a promise nobody will settle.
      if (gate !== undefined) Deferred.doneUnsafe(gate, Effect.succeed(undefined));
    },
    set: (at, owner, name, wake) => {
      const pending = select("WHERE wake IS NOT NULL AND owner = ? AND name = ?", owner, name)[0];
      if (pending !== undefined) return pending.id;
      // The payload is JSON (rule 4): one that is not (a bigint, a cycle) is refused here, not stored as something else.
      const payload = Effect.runSync(Effect.try(() => JSON.stringify(wake)).pipe(Effect.orDie));
      return insert({ at: instantOf(at, `a durable timer for ${owner} ${name}`), owner, name, holder: null, wake: payload });
    },
    clear: (owner, name) => sql.exec("DELETE FROM timers WHERE wake IS NOT NULL AND firing = 0 AND owner = ? AND name = ?", owner, name).rowsWritten > 0,
    rows: () => select("").map(rowOf),
    durable: () => select("WHERE wake IS NOT NULL").map(durableOf),
    sleeping: () => select("WHERE wake IS NULL").map(rowOf),
    earliest: (target) => {
      const first = select(target === undefined ? "" : "WHERE at <= ?", ...(target === undefined ? [] : [target]))[0];
      return first?.at;
    },
    fire: (at, source) =>
      Effect.gen(function* () {
        const fired: Array<Row & { readonly durable: boolean }> = [];
        // Each row leaves the table only as its own firing begins, so a firing that fails leaves the rest pending; and one an
        // earlier wake in this walk cleared or cancelled is gone by then, so it never fires (the rule `TimersMemory.fire` follows).
        for (const r of select("WHERE at <= ?", at)) {
          if (yield* fireOne(r, source)) fired.push({ ...rowOf(r), durable: r.wake !== null });
        }
        return fired;
      }),
    reset: () => {
      sql.exec("DELETE FROM timers");
      // A sleeper still waiting on a row is woken, uncounted (the count is the world's and starts again), not left hanging.
      for (const gate of waiting.values()) Deferred.doneUnsafe(gate, Effect.succeed(undefined));
      waiting.clear();
      woken.clear();
    },
  };
};
