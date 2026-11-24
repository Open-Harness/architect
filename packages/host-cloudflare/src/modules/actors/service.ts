import { DurableObject } from "cloudflare:workers";
import type { Committed } from "@orthograph/language-effect";
import type { ActorApi, ActorEntry, ActorRow, ActorWrite } from "./types.ts";
import { SCHEMA } from "./internal/tables.ts";
import { WorldEntry } from "#modules/world/service.js";
import type { EntryEnv } from "#modules/world/types.js";

interface Stored { readonly row: string; readonly state: string | null; readonly version: number }

/**
 * One instance of a thing that lives as an actor. Export it from the Worker's entry and bind it as `ACTORS`; the
 * store names each one `<table>:<id>`. Its commit is synchronous inside `transactionSync`, so no other request can
 * run between the version check and the write, and a failed write rolls the whole commit back.
 */
export class Actor extends DurableObject implements ActorApi {
  protected readonly world: EntryEnv;

  constructor(ctx: DurableObjectState, env: unknown) {
    super(ctx, env as never);
    this.world = env as EntryEnv;
    for (const statement of SCHEMA) ctx.storage.sql.exec(statement);
  }

  protected stored(): Stored | undefined {
    return this.ctx.storage.sql.exec<Stored & Record<string, SqlStorageValue>>("SELECT row, state, version FROM instance").toArray()[0];
  }

  /** Each entry runs in its world's time (M8.06); a real world answers at once, as before. */
  find(): ActorRow | null | Promise<ActorRow | null> {
    return WorldEntry.withinNow(this.world, () => this.read());
  }

  commit(writes: ReadonlyArray<ActorWrite>, entries: ReadonlyArray<ActorEntry>): Committed | Promise<Committed> {
    return WorldEntry.withinNow(this.world, () => {
      const outcome = this.write(writes, entries);
      if (outcome === "committed") this.committed(entries);
      return outcome;
    });
  }

  /** What a resident of this actor does once a commit is stored (the agents' Pi conversation takes an input told to it): nothing, for a plain actor. */
  protected committed(_entries: ReadonlyArray<ActorEntry>): void {}

  /** The instance as the actor keeps it, for a resident. */
  protected read(): ActorRow | null {
    const s = this.stored();
    return s ? { row: JSON.parse(s.row) as Record<string, unknown>, state: s.state, version: s.version } : null;
  }

  /** A commit made by the actor itself (a resident ending its turn): the same all-or-nothing write, with the actor's own version guard. */
  protected write(writes: ReadonlyArray<ActorWrite>, entries: ReadonlyArray<ActorEntry>): Committed {
    const sql = this.ctx.storage.sql;
    return this.ctx.storage.transactionSync((): Committed => {
      const now = this.stored();
      for (const w of writes) {
        if (w.kind === "insert") {
          sql.exec("INSERT INTO instance (one, row, state, version) VALUES (1, ?, ?, 0)", JSON.stringify(w.row), w.state);
          continue;
        }
        if (!now || now.version !== w.version) return "conflict";
        const row = { ...(JSON.parse(now.row) as Record<string, unknown>), ...w.changes };
        sql.exec("UPDATE instance SET row = ?, state = coalesce(?, state), version = version + 1", JSON.stringify(row), w.state);
      }
      for (const e of entries) {
        sql.exec("INSERT INTO journal (trace, operation, move, subject, event, fields) VALUES (?, ?, ?, ?, ?, ?)", e.trace, e.operation, e.move, e.subject, e.event, e.fields);
      }
      return "committed";
    });
  }
}
