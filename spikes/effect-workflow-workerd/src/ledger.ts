// The outside world an activity changes: one SQLite Durable Object the workflow's eviction never touches. It counts every
// time an activity's body runs (`calls`) and applies its effect once per request key (`effects`), as an operation with an
// idempotency key would (K5 seam 6: the key is run id plus activity name). Throwaway.
import { DurableObject } from "cloudflare:workers";
import type { Env } from "./app.ts";

export class Ledger extends DurableObject<Env> {
  private readonly sql: SqlStorage;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec("CREATE TABLE IF NOT EXISTS calls (run TEXT NOT NULL, activity TEXT NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (run, activity))");
    this.sql.exec("CREATE TABLE IF NOT EXISTS effects (key TEXT PRIMARY KEY, run TEXT NOT NULL, activity TEXT NOT NULL, detail TEXT NOT NULL)");
  }

  /** One run of an activity's body: counted always, applied once per key. Returns the call count and whether it applied. */
  apply(key: string, run: string, activity: string, detail: string): { call: number; applied: boolean } {
    this.sql.exec("INSERT INTO calls (run, activity, n) VALUES (?, ?, 1) ON CONFLICT (run, activity) DO UPDATE SET n = n + 1", run, activity);
    const call = this.sql.exec<{ n: number }>("SELECT n FROM calls WHERE run = ? AND activity = ?", run, activity).one().n;
    const applied = this.sql.exec("INSERT OR IGNORE INTO effects (key, run, activity, detail) VALUES (?, ?, ?, ?)", key, run, activity, detail).rowsWritten > 0;
    return { call, applied };
  }

  of(run: string) {
    const calls = Object.fromEntries(this.sql.exec<{ activity: string; n: number }>("SELECT activity, n FROM calls WHERE run = ?", run).toArray().map((r) => [r.activity, r.n]));
    const effects = Object.fromEntries(this.sql.exec<{ activity: string; detail: string }>("SELECT activity, detail FROM effects WHERE run = ?", run).toArray().map((r) => [r.activity, r.detail]));
    return { calls, effects };
  }
}
