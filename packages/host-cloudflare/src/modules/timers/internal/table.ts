// The world's timer table (M8.07): one table in the world's Durable Object, so a sleep and a durable timer share one order.
// A sleeping row lives as long as the process that parked it, which is why it is dropped when the object starts afresh;
// a durable row outlives it. Firing a row counts its owner first and only then hands it back, so the world is never quiet
// between the firing and the code that wakes.
import { Data, Deferred, Effect } from "effect";
import type { DurableTimer, Wake } from "@orthograph/language-effect";
import type { ClockSource } from "#modules/clock/types.js";
import type { Count } from "./count.ts";

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
  /** Resolves when the row fires, with the source of the instant it fired at; the sleeper is counted by then. */
  readonly wait: (id: number) => Effect.Effect<ClockSource | undefined>;
  /** True when the row had not fired and is now gone. */
  readonly cancel: (id: number) => boolean;
  readonly set: (at: number, owner: string, name: string, wake: Wake) => number;
  readonly clear: (owner: string, name: string) => boolean;
  /** Every row, in firing order: by instant, then the order set. */
  readonly rows: () => ReadonlyArray<Row>;
  readonly durable: () => ReadonlyArray<DurableTimer>;
  readonly sleeping: () => ReadonlyArray<Row>;
  /** The earliest instant a row is due at, at or before `target` when one is given. */
  readonly earliest: (target?: number) => number | undefined;
  /** Fire every row due at or before `at`, in order. A durable row goes to `wakes`; with none, its firing fails. */
  readonly fire: (at: number, source: ClockSource | undefined) => Effect.Effect<ReadonlyArray<Row & { readonly durable: boolean }>, WakeFailed>;
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

const SCHEMA = "CREATE TABLE IF NOT EXISTS timers (id INTEGER PRIMARY KEY AUTOINCREMENT, at INTEGER NOT NULL, owner TEXT NOT NULL, name TEXT NOT NULL, holder TEXT, wake TEXT)";

const rowOf = (r: Stored): Row => ({ id: r.id, at: r.at, owner: r.owner, name: r.name });

export const makeTable = (
  sql: SqlStorage,
  count: Count,
  wakes: ((timer: DurableTimer) => Effect.Effect<void>) | undefined,
  /** A real world counts nothing: nobody waits for it to be quiet. */
  counting: boolean,
): Table => {
  sql.exec(SCHEMA);
  // A sleeping row belongs to a process that is gone with this object's memory.
  sql.exec("DELETE FROM timers WHERE wake IS NULL");
  const waiting = new Map<number, Deferred.Deferred<ClockSource | undefined>>();
  const select = (where: string, ...args: Array<SqlStorageValue>) =>
    sql.exec<Stored>(`SELECT id, at, owner, name, holder, wake FROM timers ${where} ORDER BY at, id, owner`, ...args).toArray();
  const durableOf = (r: Stored): DurableTimer => ({ ...rowOf(r), wake: JSON.parse(r.wake!) as Wake });
  const insert = (r: { readonly id?: number; readonly at: number; readonly owner: string; readonly name: string; readonly holder: string | null; readonly wake: string | null }) =>
    sql.exec<{ id: number }>("INSERT INTO timers (id, at, owner, name, holder, wake) VALUES (?, ?, ?, ?, ?, ?) RETURNING id", r.id ?? null, r.at, r.owner, r.name, r.holder, r.wake).one().id;
  const forget = (id: number) => sql.exec("DELETE FROM timers WHERE id = ?", id).rowsWritten > 0;

  const fireOne = (r: Stored, source: ClockSource | undefined): Effect.Effect<void, WakeFailed> => {
    if (r.wake === null) {
      // A sleeper: count it first, then hand the instant back.
      forget(r.id);
      const gate = waiting.get(r.id);
      if (gate === undefined) return Effect.void;
      if (counting) count.enter(r.holder ?? r.owner);
      return Deferred.succeed(gate, source).pipe(Effect.asVoid);
    }
    const timer = durableOf(r);
    forget(r.id);
    if (wakes === undefined) {
      insert(r);
      return Effect.fail(new WakeFailed({ owner: r.owner, name: r.name, message: `no wake handler routes kind ${timer.wake.kind} in this world` }));
    }
    if (counting) count.enter(r.owner);
    // A wake that fails puts its row back, so the timer is not lost and the step that fired it fails, naming it.
    return wakes(timer).pipe(
      Effect.catchCause((cause) => Effect.suspend(() => {
        insert(r);
        return Effect.fail(new WakeFailed({ owner: r.owner, name: r.name, message: String(cause) }));
      })),
      Effect.ensuring(Effect.sync(() => { if (counting) count.leave(r.owner); })),
    );
  };

  return {
    add: (owner, name, at, holder) => {
      const id = insert({ at, owner, name, holder, wake: null });
      waiting.set(id, Deferred.makeUnsafe<ClockSource | undefined>());
      return id;
    },
    wait: (id) => {
      const gate = waiting.get(id);
      return gate === undefined ? Effect.never : Deferred.await(gate).pipe(Effect.ensuring(Effect.sync(() => void waiting.delete(id))));
    },
    cancel: (id) => {
      waiting.delete(id);
      return forget(id);
    },
    set: (at, owner, name, wake) => {
      const pending = select("WHERE wake IS NOT NULL AND owner = ? AND name = ?", owner, name)[0];
      return pending !== undefined ? pending.id : insert({ at, owner, name, holder: null, wake: JSON.stringify(wake) });
    },
    clear: (owner, name) => sql.exec("DELETE FROM timers WHERE wake IS NOT NULL AND owner = ? AND name = ?", owner, name).rowsWritten > 0,
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
        // Each row leaves the table only as its own firing begins, so a firing that fails leaves the rest pending.
        for (const r of select("WHERE at <= ?", at)) {
          yield* fireOne(r, source);
          fired.push({ ...rowOf(r), durable: r.wake !== null });
        }
        return fired;
      }),
    reset: () => {
      sql.exec("DELETE FROM timers");
      waiting.clear();
    },
  };
};
