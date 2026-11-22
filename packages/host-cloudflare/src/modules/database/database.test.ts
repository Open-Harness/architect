import { env } from "cloudflare:workers";
import { Effect, Layer, Tracer } from "effect";
import { SqlClient } from "effect/sql";
import { describe, expect, it } from "vitest";
import { Blueprint } from "orthograph";
import { BusyLive, Handlers, Ids, Records, Store, type Handler } from "@orthograph/language-effect";
import { StoreD1 } from "#modules/store/service.js";
import { Database } from "./service.ts";

const Allowance = Blueprint.thing({
  description: "Money a member may spend.",
  fields: { id: Blueprint.id("alw"), member: Blueprint.id("per"), limit: Blueprint.uint(128) },
});
const grant = Blueprint.operation(Allowance, {
  description: "Let a member spend, up to a limit.",
  payload: { member: Allowance.fields.member, limit: Allowance.fields.limit },
  answer: { allowance: Allowance.fields.id },
  allowed: [Blueprint.signedIn],
  steps: { insert: Blueprint.step.database() },
});

describe("D1 through SqlClient, in workerd", () => {
  it("writes and reads a real D1 row", async () => {
    const rows = await Effect.runPromise(Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* sql`INSERT INTO allowances (id, member, lim) VALUES ('alw_sql', 'per_olga', '500')`;
      return yield* sql`SELECT member, lim FROM allowances WHERE id = 'alw_sql'`;
    }).pipe(Effect.provide(Database.d1(env.DB))));
    expect(rows).toEqual([{ member: "per_olga", lim: "500" }]);
  });

  it("the handler wrapper runs in workerd: its step holds the allowance back, and the commit stores it in D1", async () => {
    const handler: Handler<typeof grant, Records> = (payload, { steps }) =>
      Effect.gen(function* () {
        const records = yield* Records;
        const id = yield* Ids.of(Allowance.fields.id);
        yield* steps.insert(records.insert(Allowance, { id, member: payload.member, limit: payload.limit }, "active"));
        return { allowance: id };
      });
    const spans: Array<Tracer.NativeSpan> = [];
    const tracer = Tracer.make({ span: (o) => { const s = new Tracer.NativeSpan(o); spans.push(s); return s; } });
    const served = Handlers.serve({ name: "allowance.grant", operation: grant, handler });
    const store = StoreD1.layer({ tables: [[Allowance, "allowance"]] }).pipe(Layer.provide(Database.d1(env.DB)));
    const most = "340282366920938463463374607431768211455";
    const program = Effect.gen(function* () {
      const answer = yield* served.call({ member: "per_olga", limit: most }, { kind: "person", person: "per_ada", via: "session" });
      return { answer, found: (yield* (yield* Store).find(Allowance, answer.allowance))?.instance };
    });
    const { answer, found } = await Effect.runPromise(program.pipe(Effect.provide(Layer.mergeAll(store, BusyLive, Layer.succeed(Tracer.Tracer, tracer)))));
    expect(found).toEqual({ id: answer.allowance, member: "per_olga", limit: 2n ** 128n - 1n, state: "active" });
    const row = await env.DB.prepare(`SELECT "limit", state FROM "allowance" WHERE id = ?`).bind(answer.allowance).first();
    expect(row).toEqual({ limit: most, state: "active" });
    const names = spans.map((s) => s.name);
    expect(names.slice(0, 2)).toEqual(["allowance.grant", "allowance.grant.insert"]);
    expect(spans[0]!.attributes.get("payload.limit")).toBe(most);
  });
});
