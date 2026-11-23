// One commit to one database: the call's inserts, its guarded updates, its journal entries and its request key, as one D1 batch. A guard that lost, or a unique index that refused (G5), is a `conflict`: the call runs again.
import { Effect } from "effect";
import type { SqlClient } from "effect/sql";
import type { D1Client } from "@effect/sql-d1";
import type { Commit, Entry, NamedRule, Write } from "@orthograph/language-effect";
import { encodeFields, lostGuard } from "./rows.ts";
import { lostUnique } from "./unique.ts";

/** A database a store lives in: its SQL client and its D1 client, from one binding. */
export interface Db {
  readonly sql: SqlClient.SqlClient;
  readonly d1: D1Client.D1Client;
}

export const commitD1 = ({ sql, d1 }: Db, tableOf: (thing: Write["thing"]) => string, { writes, entries, request }: Commit, rules: ReadonlyArray<NamedRule> = []) => {
  const statementOf = (w: Write) =>
    Effect.gen(function* () {
      const table = sql(tableOf(w.thing));
      if (w.kind === "insert") {
        const row = yield* encodeFields(w.thing, w.fields, false);
        return sql`INSERT INTO ${table} ${sql.insert({ ...row, ...(w.state ? { state: w.state } : {}), version: 0 })}`;
      }
      const row = { ...(yield* encodeFields(w.thing, w.changes, true)), ...(w.state ? { state: w.state } : {}) };
      // The guard: a stale version becomes NULL on a NOT NULL column, which fails the whole batch (D2 #36).
      const guard = sql`"version" = CASE WHEN "version" = ${w.version} THEN "version" + 1 ELSE NULL END`;
      return Object.keys(row).length > 0
        ? sql`UPDATE ${table} SET ${sql.update(row)}, ${guard} WHERE "id" = ${w.id}`
        : sql`UPDATE ${table} SET ${guard} WHERE "id" = ${w.id}`;
    });
  const journalOf = (e: Entry) =>
    sql`INSERT INTO "_journal" ${sql.insert({ trace: e.trace, operation: e.operation, move: e.move, subject: e.subject, event: e.event, fields: JSON.stringify(e.fields) })}`;

  return Effect.gen(function* () {
    const keep = request ? [sql`INSERT INTO "_requests" ${sql.insert({ key: request.key, answer: request.answer })}`] : [];
    const statements = [...(yield* Effect.forEach(writes, statementOf)), ...entries.map(journalOf), ...keep];
    if (statements.length === 0) return "committed" as const;
    return yield* d1.batch(statements).pipe(
      Effect.as("committed" as const),
      Effect.catch((e) => (lostGuard(e) || lostUnique(e, writes, tableOf, rules) ? Effect.succeed("conflict" as const) : Effect.die(e))),
    );
  });
};
