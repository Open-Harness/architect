import { Context, Effect, Layer } from "effect";
import { SqlClient } from "effect/sql";
import { D1Client } from "@effect/sql-d1";
import type { Thing } from "orthograph";
import { Store } from "@orthograph/language-effect";
import type { StoreD1Api } from "./types.ts";
import { decodeRow } from "./internal/rows.ts";
import { actorCommit, actorFind } from "./internal/actors.ts";
import { commitD1, type Db } from "./internal/commit.ts";
import { listRows } from "./internal/list.ts";

/** Which store a thing lives in, as the commit's one-owner rule sees it: its declared store, else the kind of place. */
const ownerOf = (thing: Thing): unknown => thing.store ?? thing.lives;

export const StoreD1: StoreD1Api = {
  layer: ({ tables, actors, stores = [], people, rules = [] }) =>
    Layer.effect(Store, Effect.gen(function* () {
      const home: Db = { sql: yield* SqlClient.SqlClient, d1: yield* D1Client.D1Client };
      // Each declared database store has a binding of its own, and its own `_journal` and `_requests` beside its tables.
      const apart = new Map<unknown, Db>();
      for (const [store, db] of stores) {
        const made = yield* Layer.build(D1Client.layer({ db }).pipe(Layer.orDie));
        apart.set(store, { sql: Context.get(made, SqlClient.SqlClient), d1: Context.get(made, D1Client.D1Client) });
      }
      const dbOf = (thing: Thing): Db => (thing.store ? apart.get(thing.store) ?? home : home);
      const tableOf = (thing: Thing) => tables.find(([t]) => t === thing)?.[1] ?? "";
      const noActors = Effect.die(new Error("a thing lives as an actor, but the Worker has no ACTORS binding"));
      const everyDb = [home, ...apart.values()];

      return Store.of({
        rules,
        // A request key is kept in the store its call committed to, which the key alone doesn't say: ask each.
        answered: (key) =>
          Effect.forEach(everyDb, ({ sql }) =>
            sql<{ answer: string }>`SELECT "answer" FROM "_requests" WHERE "key" = ${key}`.pipe(Effect.map((rows) => rows[0]?.answer), Effect.orDie),
          ).pipe(Effect.map((answers) => answers.find((a) => a !== undefined))),
        list: (query) =>
          query.thing === people?.thing
            ? Effect.die(new Error("a list read of people: they are the identity's users, read by id only until the identity plugin (M2.05)"))
          : query.thing.lives === "actor"
            ? Effect.die(new Error("a list read needs a thing that lives in the database; actors keep one instance each"))
            : listRows(dbOf(query.thing).sql, tableOf(query.thing), query),
        // #764: a row's place in the order rows were made is its rowid, as `list` gives it.
        place: (thing, id) =>
          thing === people?.thing || thing.lives === "actor"
            ? Effect.succeed(undefined)
            : dbOf(thing).sql<{ place: number }>`SELECT rowid AS "place" FROM ${dbOf(thing).sql(tableOf(thing))} WHERE "id" = ${id}`.pipe(
                Effect.map((rows) => (rows[0] === undefined ? undefined : Number(rows[0].place))), Effect.orDie),
        find: (thing, id) =>
          thing === people?.thing
            ? Effect.gen(function* () {
                const rows = yield* home.sql`SELECT * FROM ${home.sql(people.table)} WHERE "id" = ${id}`.pipe(Effect.orDie);
                const row = rows[0] as Record<string, unknown> | undefined;
                return row ? yield* decodeRow(thing, row) : undefined;
              })
          : thing.lives === "actor"
            ? (actors ? actorFind(actors, thing, tableOf(thing), id) : noActors)
            : Effect.gen(function* () {
                const rows = yield* dbOf(thing).sql`SELECT * FROM ${dbOf(thing).sql(tableOf(thing))} WHERE "id" = ${id}`.pipe(Effect.orDie);
                const row = rows[0] as Record<string, unknown> | undefined;
                return row ? yield* decodeRow(thing, row) : undefined;
              }),
        commit: (commit) => {
          const owners = new Set(commit.writes.map((w) => ownerOf(w.thing)));
          if (owners.size > 1) return Effect.die(new Error("a call wrote to more than one store: one call commits to one store, and work across stores is a workflow (K3 item 5)"));
          const first = commit.writes[0]?.thing;
          if (first?.lives !== "actor") {
            const db = first ? dbOf(first) : home;
            // A list is guarded in the database the call commits to; a list of another store's things can't be held in this batch.
            const lists = (commit.lists ?? []).filter((l) => l.thing.lives !== "actor" && l.thing !== people?.thing && dbOf(l.thing) === db);
            return commitD1(db, tableOf, { ...commit, lists }, rules);
          }
          if (commit.request) return Effect.die(new Error("a request key on an actor's operation: idempotent actors arrive with layer four (design/later.md)"));
          return actors ? actorCommit(actors, commit, tableOf) : noActors;
        },
      });
    })),
};
