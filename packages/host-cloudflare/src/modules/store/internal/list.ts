// A page of a thing's rows: filtered by the fields it is asked for, in the order the rows were made (SQLite's rowid).
import { Effect } from "effect";
import type { SqlClient } from "effect/sql";
import type { ListQuery, Page } from "@orthograph/language-effect";
import { decodeRow, encodeFields } from "./rows.ts";

/** The equality filters a list asks for, as columns: its known fields encoded, and its state. A key the thing has no field for is left out. */
export const filtersOf = (sql: SqlClient.SqlClient, { thing, where, state }: Pick<ListQuery, "thing" | "where" | "state">) =>
  Effect.map(encodeFields(thing, Object.fromEntries(Object.entries(where).filter(([k]) => k in thing.fields)), true), (encoded) => [
    ...Object.entries(encoded).map(([k, v]) => sql`${sql(k)} = ${v}`),
    ...(state !== undefined ? [sql`"state" = ${state}`] : []),
  ]);

/**
 * One more row than the page is fetched, to know whether another page follows. The cursor is the last kept row's rowid:
 * the next page starts after it, so rows made meanwhile never shift a page (unlike an offset). Each row's rowid is its place, and comes with its version.
 */
export const listRows = (sql: SqlClient.SqlClient, table: string, { thing, where, state, order, limit, after }: ListQuery): Effect.Effect<Page> =>
  Effect.gen(function* () {
    const conditions = [
      ...(yield* filtersOf(sql, { thing, where, state })),
      ...(after !== undefined ? [order === "newest" ? sql`rowid < ${Number(after)}` : sql`rowid > ${Number(after)}`] : []),
    ];
    const filter = conditions.length > 0 ? sql` WHERE ${sql.and(conditions)}` : sql``;
    const direction = order === "newest" ? sql`DESC` : sql`ASC`;
    const rows = (yield* sql`SELECT rowid AS "_cursor", * FROM ${sql(table)}${filter} ORDER BY rowid ${direction} LIMIT ${limit + 1}`.pipe(Effect.orDie)) as ReadonlyArray<Record<string, unknown>>;
    const kept = rows.slice(0, limit);
    const decoded = yield* Effect.forEach(kept, (row) => decodeRow(thing, row));
    return {
      items: decoded.map((r) => r.instance),
      rows: decoded.map((r, i) => ({ version: r.version, place: Number(kept[i]!["_cursor"]) })),
      next: rows.length > limit ? String(kept[kept.length - 1]!["_cursor"]) : null,
    };
  });
