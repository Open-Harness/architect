// The world: a stepped instant and a timer table, one Durable Object (K23 section 5, cut down to what this spike needs).
// Every workflow wait on time is a row here; `advance` moves the instant to each due row in order and fires it by
// completing the workflow's durable deferred through the engine. Throwaway.
import { DurableObject } from "cloudflare:workers";
import { Effect, Exit } from "effect";
import * as DurableDeferred from "effect/workflow/DurableDeferred";
import { app, type Env } from "./app.ts";
import { setInstant } from "./world-clock.ts";

/** Where the stepped clock starts: 1 November 2026, 09:00 UTC (K23's example). */
export const T0 = Date.UTC(2026, 10, 1, 9);

/** A timer's deferred: one per named wait, void. */
export const timerDeferred = (name: string) => DurableDeferred.make(`Timers/${name}`);

export interface Fired { readonly at: number; readonly owner: string; readonly name: string; readonly firedBefore: boolean }

export class World extends DurableObject<Env> {
  private readonly sql: SqlStorage;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec("CREATE TABLE IF NOT EXISTS clock (id INTEGER PRIMARY KEY CHECK (id = 0), instant INTEGER NOT NULL)");
    this.sql.exec(`CREATE TABLE IF NOT EXISTS timers (seq INTEGER PRIMARY KEY AUTOINCREMENT, at INTEGER NOT NULL, owner TEXT NOT NULL,
      name TEXT NOT NULL, token TEXT NOT NULL, fired INTEGER NOT NULL DEFAULT 0, set_at INTEGER NOT NULL, UNIQUE (owner, name))`);
    this.sql.exec("INSERT OR IGNORE INTO clock (id, instant) VALUES (0, ?)", T0);
  }

  now(): number {
    const instant = this.sql.exec<{ instant: number }>("SELECT instant FROM clock").one().instant;
    setInstant(instant);
    return instant;
  }

  /** `Timers.at`: one row per (owner, name). A second call for the same wait keeps the first row. */
  at(at: number, owner: string, name: string, token: string): { at: number; inserted: boolean } {
    const before = this.sql.exec("SELECT 1 FROM timers WHERE owner = ? AND name = ?", owner, name).toArray().length;
    this.sql.exec("INSERT OR IGNORE INTO timers (at, owner, name, token, set_at) VALUES (?, ?, ?, ?, ?)", at, owner, name, token, this.now());
    const row = this.sql.exec<{ at: number }>("SELECT at FROM timers WHERE owner = ? AND name = ?", owner, name).one();
    return { at: row.at, inserted: before === 0 };
  }

  timers() {
    return this.sql.exec("SELECT seq, at, owner, name, fired, set_at FROM timers ORDER BY at, seq").toArray();
  }

  /** Move to `now + span`, stopping at each due timer in order (by instant, then the order set) and firing it. */
  async advance(span: number): Promise<{ from: number; to: number; fired: Array<Fired> }> {
    const from = this.now();
    const to = from + span;
    const fired: Array<Fired> = [];
    for (;;) {
      const next = this.sql.exec<{ at: number | null }>("SELECT MIN(at) AS at FROM timers WHERE fired = 0 AND at <= ?", to).one().at;
      if (next === null) break;
      this.setNow(Math.max(next, this.now()));
      const due = this.sql.exec<{ seq: number; at: number; owner: string; name: string; token: string }>(
        "SELECT seq, at, owner, name, token FROM timers WHERE fired = 0 AND at = ? ORDER BY seq", next).toArray();
      for (const t of due) {
        this.sql.exec("UPDATE timers SET fired = 1 WHERE seq = ?", t.seq);
        await this.deliver(t.name, t.token);
        fired.push({ at: t.at, owner: t.owner, name: t.name, firedBefore: false });
      }
    }
    this.setNow(to);
    return { from, to, fired };
  }

  /** Fire one timer again, whatever its state: the duplicate wake-up the dedup check sends. */
  async refire(owner: string, name: string): Promise<Fired> {
    const t = this.sql.exec<{ at: number; token: string; fired: number }>("SELECT at, token, fired FROM timers WHERE owner = ? AND name = ?", owner, name).one();
    await this.deliver(name, t.token);
    return { at: t.at, owner, name, firedBefore: t.fired === 1 };
  }

  private setNow(instant: number) {
    this.sql.exec("UPDATE clock SET instant = ? WHERE id = 0", instant);
    setInstant(instant);
  }

  private async deliver(name: string, token: string) {
    const runtime = await app(this.env);
    await runtime.runPromise(DurableDeferred.done(timerDeferred(name), { token: token as DurableDeferred.Token, exit: Exit.void }).pipe(Effect.asVoid));
  }
}
