import { Effect, Layer } from "effect";
import { SqlClient } from "effect/sql";
import { Journal, type Entry } from "@orthograph/language-effect";
import type { JournalD1Api } from "./types.ts";

interface Row { readonly trace: string; readonly operation: string; readonly move: string; readonly subject: string; readonly event: string; readonly fields: string }

const entryOf = (r: Row): Entry => ({ ...r, fields: JSON.parse(r.fields) as Entry["fields"] });

export const JournalD1: JournalD1Api = {
  layer: Layer.effect(Journal, Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    return Journal.of({
      ofTrace: (trace) =>
        sql<Row>`SELECT * FROM "_journal" WHERE "trace" = ${trace} ORDER BY "seq"`.pipe(Effect.map((rows) => rows.map(entryOf)), Effect.orDie),
    });
  })),
  // Each declared store keeps its own `_journal`; a trace's entries are the default's, then each store's, each in its own order.
  across: (stores) => Layer.effect(Journal, Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    return Journal.of({
      ofTrace: (trace) =>
        Effect.gen(function* () {
          const home = yield* sql<Row>`SELECT * FROM "_journal" WHERE "trace" = ${trace} ORDER BY "seq"`;
          const apart = yield* Effect.forEach(stores, (db) =>
            Effect.promise(() => db.prepare(`SELECT * FROM "_journal" WHERE "trace" = ? ORDER BY "seq"`).bind(trace).all<Row>()));
          return [...home, ...apart.flatMap((a) => a.results)].map(entryOf);
        }).pipe(Effect.orDie),
    });
  })),
};
