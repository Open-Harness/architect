// The world's facts: what `prove` reads back after a call, straight from the database, in wire form.
// `GET /_world/facts/record?table=<thing>&id=<id>` gives a row (or null); `GET /_world/facts/journal?trace=<id>` the
// trace's journal entries. Only tables the generated server names can be read. A declared store (K3) is its own
// database with its own tables and `_journal`: a table is read from the database it is in, and a trace's entries
// are the default's, then each store's.
import { Effect } from "effect";
import type { WorldHost } from "../types.ts";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

type Where = Pick<WorldHost, "db" | "tables" | "stores" | "actors" | "actorTables">;

/** A thing that lives as an actor has no table: its row is what its Durable Object keeps, shown as a table's row is (fields in wire form, `state`, `version`). */
const actorRecord = (actors: DurableObjectNamespace, table: string, id: string) =>
  Effect.promise(() => {
    const stub = actors.get(actors.idFromName(`${table}:${id}`)) as unknown as { find(): Promise<{ row: Record<string, unknown>; state: string | null; version: number } | null> };
    return stub.find();
  }).pipe(Effect.map((found) => (found === null ? null : { ...found.row, state: found.state, version: found.version })));

export const facts = ({ db, tables, stores = [], actors, actorTables = [] }: Where, request: Request): Effect.Effect<Response> =>
  Effect.gen(function* () {
    const url = new URL(request.url);
    const q = (k: string) => url.searchParams.get(k) ?? "";
    if (url.pathname === "/_world/facts/record") {
      const table = q("table");
      if (actorTables.includes(table)) return actors ? json(yield* actorRecord(actors, table, q("id"))) : json({ error: `${table} lives as actors, and this Worker has no ACTORS binding` }, 404);
      const holder = tables.includes(table) ? db : stores.find((s) => s.tables.includes(table))?.db;
      if (!holder) return json({ error: `no table ${table}` }, 404);
      const row = yield* Effect.promise(() => holder.prepare(`SELECT * FROM "${table}" WHERE "id" = ?`).bind(q("id")).first());
      return json(row ?? null);
    }
    // Every entry the default database's journal gained after `after`: what a step that makes no call of its own (a clock move) wrote while it ran.
    if (url.pathname === "/_world/facts/journal" && /^\d+$/.test(q("after"))) {
      const found = yield* Effect.promise(() => db.prepare(`SELECT * FROM "_journal" WHERE "seq" > ? ORDER BY "seq"`).bind(Number(q("after"))).all<{ fields: string }>());
      return json(found.results.map((r) => ({ ...r, fields: JSON.parse(r.fields) as unknown })));
    }
    if (url.pathname === "/_world/facts/journal") {
      const each = yield* Effect.forEach([db, ...stores.map((s) => s.db)], (d) =>
        Effect.promise(() => d.prepare(`SELECT * FROM "_journal" WHERE "trace" = ? ORDER BY "seq"`).bind(q("trace")).all<{ fields: string }>()));
      return json(each.flatMap((r) => r.results).map((r) => ({ ...r, fields: JSON.parse(r.fields) as unknown })));
    }
    return json({ error: "not a door the world has" }, 404);
  });
