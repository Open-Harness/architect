// One commit to one database: the call's inserts, its guarded updates, its journal entries and its request key, as one D1 batch. A guard that lost, or a unique index that refused (G5), is a `conflict`: the call runs again.
import { Effect } from "effect";
import type { SqlClient } from "effect/sql";
import type { D1Client } from "@effect/sql-d1";
import type { Commit, Entry, ListRead, NamedRule, Write } from "@orthograph/language-effect";
import { encodeFields, lostGuard } from "./rows.ts";
import { filtersOf } from "./list.ts";
import { lostUnique } from "./unique.ts";

/** A database a store lives in: its SQL client and its D1 client, from one binding. */
export interface Db {
  readonly sql: SqlClient.SqlClient;
  readonly d1: D1Client.D1Client;
}

export const commitD1 = ({ sql, d1 }: Db, tableOf: (thing: Write["thing"]) => string, { writes, entries, request, lists = [] }: Commit, rules: ReadonlyArray<NamedRule> = []) => {
  /**
   * #764: a list's rows count as read. Before the call's own writes, the rows matching the list's `where` and `state` must still be the ones it read, at
   * the same versions (their `id:version`, sorted by id). When they moved, a row of the table gets a NULL version, as a lost update guard does, and the
   * batch fails as a `conflict`. A table with no rows has nothing that moved: rows are never deleted.
   */
  const guardOf = ({ thing, where, state, rows }: ListRead) =>
    Effect.gen(function* () {
      const table = sql(tableOf(thing));
      const conditions = yield* filtersOf(sql, { thing, where, state });
      const filter = conditions.length > 0 ? sql` WHERE ${sql.and(conditions)}` : sql``;
      const read = [...rows].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)).map((r) => `${r.id}:${r.version}`).join(",");
      const now = sql`COALESCE((SELECT group_concat("row", ',') FROM (SELECT "id" || ':' || "version" AS "row" FROM ${table}${filter} ORDER BY "id")), '')`;
      return sql`UPDATE ${table} SET "version" = NULL WHERE rowid = (SELECT min(rowid) FROM ${table}) AND ${now} <> ${read}`;
    });
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
    const changes = [...(yield* Effect.forEach(writes, statementOf)), ...entries.map(journalOf), ...keep];
    if (changes.length === 0) return "committed" as const;
    const statements = [...(yield* Effect.forEach(lists, guardOf)), ...changes];
    return yield* d1.batch(statements).pipe(
      Effect.as("committed" as const),
      Effect.catch((e) => (lostGuard(e) || lostUnique(e, writes, tableOf, rules) ? Effect.succeed("conflict" as const) : Effect.die(e))),
    );
  });
};
