// Two stores in one Worker (K3, M1.17): a thing in a declared store is read and committed in its own D1, with its own
// journal and request keys, beside the default; a call that writes to both is refused.
import { env } from "cloudflare:workers";
import { Cause, Effect, Exit, Layer } from "effect";
import { SqlClient } from "effect/sql";
import { describe, expect, it } from "vitest";
import { Blueprint } from "orthograph";
import { Journal, Store, type Entry } from "@orthograph/language-effect";
import { Database } from "#modules/database/service.js";
import { JournalD1 } from "#modules/journal/service.js";
import { facts } from "#modules/world/internal/facts.js";
import { StoreD1 } from "./service.ts";

const vault = Blueprint.store.database();
const Line = Blueprint.thing({ description: "A line in the vault.", fields: { id: Blueprint.id("lin"), amount: Blueprint.uint(64) }, lives: vault });
const Note = Blueprint.thing({ description: "A note in the default store.", fields: { id: Blueprint.id("not"), tags: Blueprint.text(), owner: Blueprint.text(), label: Blueprint.text() } });

const home = Database.d1(env.DB);
const stores = StoreD1.layer({ tables: [[Line, "line"], [Note, "note"]], stores: [[vault, env.DB_VAULT]] }).pipe(Layer.provide(home));
const entry = (trace: string): Entry => ({ trace, operation: "line.add", move: "add", subject: "lin_1", event: "LineAdded", fields: { line: "lin_1" } });
const count = (db: D1Database, table: string, where = "1 = 1") => db.prepare(`SELECT count(*) AS n FROM "${table}" WHERE ${where}`).first<{ n: number }>().then((r) => r?.n);

describe("a thing in a declared store", () => {
  it("is committed in its own database with its journal entry and request key, and the default has none of it", async () => {
    const program = Effect.gen(function* () {
      const store = yield* Store;
      const done = yield* store.commit({
        writes: [{ kind: "insert", thing: Line, fields: { id: "lin_1", amount: 5n }, state: undefined }],
        entries: [entry("t-vault")],
        request: { key: "key-1", answer: '{"line":"lin_1"}' },
      });
      return { done, found: yield* store.find(Line, "lin_1"), answered: yield* store.answered("key-1"), missing: yield* store.answered("nothing") };
    });
    const { done, found, answered, missing } = await Effect.runPromise(program.pipe(Effect.provide(stores)));
    expect(done).toBe("committed");
    expect(found?.instance).toEqual({ id: "lin_1", amount: 5n });
    expect(answered).toBe('{"line":"lin_1"}');
    expect(missing).toBeUndefined();
    expect(await count(env.DB_VAULT, "line", `"id" = 'lin_1'`)).toBe(1);
    expect(await count(env.DB_VAULT, "_journal", `"trace" = 't-vault'`)).toBe(1);
    expect(await count(env.DB_VAULT, "_requests", `"key" = 'key-1'`)).toBe(1);
    expect(await count(env.DB, "_journal", `"trace" = 't-vault'`)).toBe(0);
    expect(await count(env.DB, "_requests", `"key" = 'key-1'`)).toBe(0);
    // The table isn't even in the default database.
    expect(await env.DB.prepare(`SELECT name FROM sqlite_master WHERE name = 'line'`).first()).toBeNull();
  });

  it("a thing in no store lives in the default database, beside it", async () => {
    const program = Effect.gen(function* () {
      const store = yield* Store;
      return yield* store.commit({ writes: [{ kind: "insert", thing: Note, fields: { id: "not_s1", tags: "t", owner: "o", label: "l" }, state: undefined }], entries: [entry("t-home")] });
    });
    expect(await Effect.runPromise(program.pipe(Effect.provide(stores)))).toBe("committed");
    expect(await count(env.DB, "note", `"id" = 'not_s1'`)).toBe(1);
    expect(await count(env.DB, "_journal", `"trace" = 't-home'`)).toBe(1);
    expect(await count(env.DB_VAULT, "_journal", `"trace" = 't-home'`)).toBe(0);
  });

  it("a call that writes to two stores is refused, and nothing is written to either", async () => {
    const program = Effect.gen(function* () {
      return yield* (yield* Store).commit({
        writes: [
          { kind: "insert", thing: Line, fields: { id: "lin_x", amount: 1n }, state: undefined },
          { kind: "insert", thing: Note, fields: { id: "not_x", tags: "t", owner: "o", label: "l" }, state: undefined },
        ],
        entries: [],
      });
    });
    const exit = await Effect.runPromiseExit(program.pipe(Effect.provide(stores)));
    expect(Exit.isFailure(exit) && String(Cause.squash(exit.cause))).toMatch(/more than one store/);
    expect(await count(env.DB_VAULT, "line", `"id" = 'lin_x'`)).toBe(0);
    expect(await count(env.DB, "note", `"id" = 'not_x'`)).toBe(0);
  });

  it("the journal reads each store's entries beside the default's, and the world's facts read each store's tables", async () => {
    const entries = await Effect.runPromise(Effect.gen(function* () { return yield* (yield* Journal).ofTrace("t-vault"); }).pipe(Effect.provide(JournalD1.across([env.DB_VAULT])), Effect.provide(home)));
    expect(entries.map((e) => e.event)).toEqual(["LineAdded"]);
    const alone = await Effect.runPromise(Effect.gen(function* () { return yield* (yield* Journal).ofTrace("t-vault"); }).pipe(Effect.provide(JournalD1.layer), Effect.provide(home)));
    expect(alone).toEqual([]);
    const world = { worlds: env.WORLD, db: env.DB, tables: ["note"], stores: [{ db: env.DB_VAULT, tables: ["line"] }] };
    const get = (path: string) => Effect.runPromise(facts(world, new Request(`http://world${path}`))).then(async (r) => ({ status: r.status, body: (await r.json()) as unknown }));
    expect(await get("/_world/facts/record?table=line&id=lin_1")).toMatchObject({ status: 200, body: { id: "lin_1", amount: "5" } });
    expect(await get("/_world/facts/record?table=note&id=not_s1")).toMatchObject({ status: 200, body: { id: "not_s1" } });
    expect(await get("/_world/facts/record?table=other&id=x")).toMatchObject({ status: 404 });
    expect(await get("/_world/facts/journal?trace=t-vault")).toMatchObject({ status: 200, body: [{ event: "LineAdded" }] });
  });

  it("its own SqlClient is the default's: a SqlClient query never sees the store's tables", async () => {
    const tables = await Effect.runPromise(Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      return yield* sql`SELECT name FROM sqlite_master WHERE name = 'line'`;
    }).pipe(Effect.provide(home)));
    expect(tables).toEqual([]);
  });
});
