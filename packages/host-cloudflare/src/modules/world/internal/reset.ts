// `POST /_world/reset`: empty the world's databases (the default and each declared store), so a warm world (`ortho dev`) starts a
// prove run with none of the last run's records (ST1.24). The tables stay; migrations' own bookkeeping is kept. The world's cast
// is kept too, with the people it signed up: they are the world's population, not a run's records, and signing one up again
// costs a password hash each (a cast of twenty is three seconds). Whatever else a person had, sessions and keys and the rest of
// the identity tables included, goes. The cast is the Durable Object's own: its front door answers who is in it.
import { Effect } from "effect";
import type { WorldHost } from "../types.ts";

type Where = Pick<WorldHost, "db" | "stores">;

const TABLES = "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name <> 'd1_migrations'";

/** The identity tables whose rows of the cast's people survive a reset, and the column holding the person. */
const KEPT: Readonly<Record<string, string>> = { auth_user: "id", auth_account: "userId" };

const emptied = (db: D1Database, people: ReadonlyArray<string>) =>
  Effect.gen(function* () {
    const found = yield* Effect.promise(() => db.prepare(TABLES).all<{ name: string }>());
    const names = found.results.map((r) => r.name);
    if (names.length === 0) return;
    const keep = JSON.stringify(people);
    yield* Effect.promise(() => db.batch([
      db.prepare("PRAGMA defer_foreign_keys = true"),
      ...names.map((name) => KEPT[name] === undefined
        ? db.prepare(`DELETE FROM "${name}"`)
        : db.prepare(`DELETE FROM "${name}" WHERE "${KEPT[name]}" NOT IN (SELECT value FROM json_each(?))`).bind(keep)),
    ]));
  });

/** Empty every table of the default database and of each store; `people` are the cast's persons, whose identity rows stay. */
export const resetDatabases = ({ db, stores = [] }: Where, people: ReadonlyArray<string>) =>
  Effect.forEach([db, ...stores.map((s) => s.db)], (d) => emptied(d, people), { discard: true });
