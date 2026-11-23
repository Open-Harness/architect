import { env } from "cloudflare:workers";
import { Cause, Effect, Exit, Layer, Schema } from "effect";
import { describe, expect, it } from "vitest";
import { Blueprint, type Thing } from "orthograph";
import { Store } from "@orthograph/language-effect";
import { Database } from "#modules/database/service.js";
import { race } from "../../../test/race.ts";
import { decodeRow, encodeFields } from "./internal/rows.ts";
import { StoreD1 } from "./service.ts";

describe("the store in D1, in workerd", () => {
  it("S3's race: 50 concurrent spends of 10 against 500 all land, none lost, and it ends exhausted", { timeout: 60_000 }, async () => {
    const store = (purse: Thing) => StoreD1.layer({ tables: [[purse, "purse"]] }).pipe(Layer.provide(Database.d1(env.DB)));
    const result = await Effect.runPromise(race("database", store));
    expect(result.failures.slice(0, 3)).toEqual([]);
    expect(result.accepted).toBe(50);
    expect(result.after?.instance).toMatchObject({ spent: 500n, state: "exhausted" });
    expect(result.after?.version).toBe(50);
    expect(Exit.isFailure(result.refused) && Cause.squash(result.refused.cause)).toMatchObject({ _tag: "PurseNotActive", state: "exhausted" });
    const events = await env.DB.prepare(`SELECT count(*) AS n FROM "_journal" WHERE "subject" = ? AND "event" = 'PurseSpent'`).bind(result.after?.instance["id"]).first<{ n: number }>();
    expect(events?.n).toBe(50);
  });
});

describe("a row's columns (STO-23)", () => {
  const Tags = Blueprint.value(Schema.Array(Schema.String));
  const Owner = Blueprint.value(Schema.Struct({ name: Schema.String, age: Schema.Number }));
  const Label = Blueprint.value(Schema.String);
  const Note = Blueprint.thing({ description: "A note.", fields: { id: Blueprint.id("not"), tags: Tags, owner: Owner, label: Label } });
  const store = StoreD1.layer({ tables: [[Note, "note"]] }).pipe(Layer.provide(Database.d1(env.DB)));
  const instance = { id: "not_1", tags: ["a", "b"], owner: { name: "Ada", age: 36 }, label: "[draft]" };

  it("keeps an array field and a struct field as JSON, which D1 can bind; a string starting with [ stays a string", async () => {
    const row = await Effect.runPromise(encodeFields(Note, instance, false));
    expect(row).toEqual({ id: "not_1", tags: '["a","b"]', owner: '{"name":"Ada","age":36}', label: "[draft]" });
    const back = await Effect.runPromise(decodeRow(Note, { ...row, version: 1 }));
    expect(back.instance).toEqual(instance);
  });

  it("commits them to a real D1 row and reads them back, an update of the array included", async () => {
    const program = Effect.gen(function* () {
      const records = yield* Store;
      expect(yield* records.commit({ writes: [{ kind: "insert", thing: Note, fields: instance, state: undefined }], entries: [] })).toBe("committed");
      const first = yield* records.find(Note, "not_1");
      const moved = yield* records.commit({ writes: [{ kind: "update", thing: Note, id: "not_1", version: 0, changes: { tags: ["c"] }, state: undefined }], entries: [] });
      return { first, moved, second: yield* records.find(Note, "not_1") };
    });
    const { first, moved, second } = await Effect.runPromise(program.pipe(Effect.provide(store)));
    expect(first?.instance).toEqual(instance);
    expect(moved).toBe("committed");
    expect(second?.instance).toEqual({ ...instance, tags: ["c"] });
    const stored = await env.DB.prepare(`SELECT "tags", "owner", "label" FROM "note" WHERE "id" = ?`).bind("not_1").first();
    expect(stored).toEqual({ tags: '["c"]', owner: '{"name":"Ada","age":36}', label: "[draft]" });
  });
});
