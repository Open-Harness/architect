import { env } from "cloudflare:workers";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { Principals } from "@orthograph/language-effect";
import { AuthD1 } from "#modules/auth/service.js";
import { toWorld } from "./service.ts";

const world = { worlds: env.WORLD, db: env.DB, tables: ["allowance"] };

const cast = (names: ReadonlyArray<string>, anonymous: ReadonlyArray<string> = []) =>
  toWorld(world, new Request("http://world/_world/cast", { method: "POST", body: JSON.stringify({ names, anonymous }) }))
    .then((r) => r.json() as Promise<Record<string, { person?: string; token?: string; email: string; password: string }>>);

describe("the world Durable Object, in workerd", () => {
  it("signs the cast up once through Better Auth, with tokens the Worker accepts; an anonymous member only gets credentials", { timeout: 30_000 }, async () => {
    const first = await cast(["ada", "olga"], ["newcomer"]);
    const again = await cast(["ada"]);
    expect(first["ada"]!.person).toMatch(/^per_[0-9a-z]{16}$/);
    expect(again["ada"]!.person).toBe(first["ada"]!.person);
    expect(first["olga"]!.person).not.toBe(first["ada"]!.person);
    const principal = await Effect.runPromise(
      Effect.flatMap(Principals, (p) => p.of(`Bearer ${again["ada"]!.token}`)).pipe(Effect.provide(AuthD1.layer(AuthD1.make({ db: env.DB, secret: env.AUTH_SECRET })))),
    );
    expect(principal).toEqual({ kind: "person", person: first["ada"]!.person, email: first["ada"]!.email, via: "session" });
    expect(first["newcomer"]).toEqual({ email: expect.stringMatching(/^newcomer\..+@world\.test$/), password: expect.any(String) });
  });

  it("answers health", async () => {
    expect((await toWorld(world, new Request("http://world/_world/health"))).status).toBe(200);
  });

  it("resets only on a request that names its world in a header, keeping the cast and emptying the rest; a world with leases answers 404", { timeout: 30_000 }, async () => {
    const reset = (headers: Record<string, string> = {}, at = world) => toWorld(at, new Request("http://world/_world/reset", { method: "POST", headers }));
    const kept = await cast(["keeper"]);
    await env.DB.prepare(`INSERT INTO "allowance" ("id", "member", "limit", "state") VALUES ('alw_r1', 'per_o', '5', 'active')`).run();
    expect((await reset()).status, "a page cannot send the header cross-origin without a preflight").toBe(400);
    expect(await env.DB.prepare(`SELECT id FROM "allowance" WHERE id = 'alw_r1'`).first(), "refused, so nothing was emptied").not.toBeNull();
    expect((await reset({ "x-ortho-world": "mine" })).status).toBe(200);
    expect(await env.DB.prepare(`SELECT id FROM "allowance" WHERE id = 'alw_r1'`).first()).toBeNull();
    expect((await cast(["keeper"]))["keeper"]!.person).toBe(kept["keeper"]!.person);
    expect((await reset({ "x-ortho-world": "mine" }, leased)).status, "a world with leases is ended by its lease").toBe(404);
  });

  it("reads facts from the database: a row, and a trace's journal", async () => {
    await env.DB.prepare(`INSERT INTO "allowance" ("id", "member", "limit", "state") VALUES ('alw_f1', 'per_o', '5', 'active')`).run();
    await env.DB.prepare(`INSERT INTO "_journal" ("trace", "operation", "move", "subject", "event", "fields") VALUES ('t9', 'allowance.grant', 'grant', 'alw_f1', 'Granted', '{"allowance":"alw_f1"}')`).run();
    const row = await (await toWorld(world, new Request("http://world/_world/facts/record?table=allowance&id=alw_f1"))).json();
    expect(row).toMatchObject({ id: "alw_f1", state: "active" });
    const journal = await (await toWorld(world, new Request("http://world/_world/facts/journal?trace=t9"))).json();
    expect(journal).toEqual([expect.objectContaining({ event: "Granted", fields: { allowance: "alw_f1" } })]);
    expect((await toWorld(world, new Request("http://world/_world/facts/record?table=secrets&id=x"))).status).toBe(404);
  });

  it("reads the facts of a thing that lives as an actor from its Durable Object, as a row of a table would read; none yet is null", async () => {
    const actorWorld = { ...world, tables: ["allowance", "purse"], actors: env.ACTORS, actorTables: ["purse"] };
    const stub = env.ACTORS.get(env.ACTORS.idFromName("purse:prs_f1")) as unknown as { commit(w: unknown, e: unknown): Promise<string> };
    expect(await stub.commit([{ kind: "insert", row: { id: "prs_f1", owner: "per_o" }, state: "active" }], [])).toBe("committed");
    const row = await (await toWorld(actorWorld, new Request("http://world/_world/facts/record?table=purse&id=prs_f1"))).json();
    expect(row).toEqual({ id: "prs_f1", owner: "per_o", state: "active", version: 0 });
    const none = await toWorld(actorWorld, new Request("http://world/_world/facts/record?table=purse&id=prs_nothing"));
    expect(none.status).toBe(200);
    expect(await none.json()).toBeNull();
    // Without the namespace the Worker cannot read one: a plain refusal, not a database error.
    expect((await toWorld({ ...world, tables: ["purse"], actorTables: ["purse"] }, new Request("http://world/_world/facts/record?table=purse&id=prs_f1"))).status).toBe(404);
  });
});


const leased = { ...world, leases: true };
const door = (path: string, method = "GET", body?: object) => toWorld(leased, new Request(`http://world/_world/worlds${path}`, {
  method, ...(body ? { body: JSON.stringify(body) } : {}),
}));
const lease = (id: string) => door("", "POST", { id, lifetimeMs: 60_000 });
const liveWorlds = () => door("").then((r) => r.json() as Promise<{ worlds: Array<{ id: string; expires: number }> }>);
const insertAllowance = (id: string) => env.DB.prepare(`INSERT INTO "allowance" ("id", "member", "limit", "state") VALUES (?, 'per_o', '5', 'active')`).bind(id).run();
const hasAllowance = (id: string) => env.DB.prepare(`SELECT "id" FROM "allowance" WHERE "id" = ?`).bind(id).first();

// These exercise multiple real D1 transactions and Durable Object requests. Match the bounded 60-second
// integration budget used by the actor race; CI startup/load must not cut off a still-running cleanup at 5 seconds.
describe("world leases, in real workerd and D1", () => {
  it("admits exactly one concurrent creation and removes only that world's rows", { timeout: 60_000 }, async () => {
    const ids = Array.from({ length: 8 }, (_, i) => `race-${i}`);
    await insertAllowance("before-race");
    try {
      const responses = await Promise.all(ids.map(lease));
      const statuses = responses.map((r) => r.status).sort();
      expect(statuses).toEqual([201, 409, 409, 409, 409, 409, 409, 409]);
      const held = (await liveWorlds()).worlds;
      expect(held).toHaveLength(1);
      const winner = held[0]!;
      for (const refused of responses.filter((r) => r.status === 409)) {
        expect(await refused.json()).toEqual({ error: "WorldLive", id: winner.id, expires: winner.expires });
      }
      await insertAllowance("during-race");
      expect((await door(`/${winner.id}`, "DELETE")).status).toBe(200);
      expect((await liveWorlds()).worlds).toEqual([]);
      expect(await hasAllowance("before-race")).not.toBeNull();
      expect(await hasAllowance("during-race")).toBeNull();
    } finally {
      for (const id of ids) await door(`/${id}`, "DELETE");
      await env.DB.prepare(`DELETE FROM "allowance" WHERE "id" IN ('before-race', 'during-race')`).run();
    }
  });

  it("ends once when alarm-style and explicit teardown overlap, and an old teardown leaves the next world intact", { timeout: 60_000 }, async () => {
    const id = "end-race";
    const next = "after-end-race";
    try {
      expect((await lease(id)).status).toBe(201);
      await insertAllowance("ending-world");
      const object = env.WORLD.get(env.WORLD.idFromName(id));
      const endings = await Promise.all(Array.from({ length: 8 }, (_, i) => object.fetch(new Request("http://world/_world/end", {
        method: "POST", body: JSON.stringify({ id, reason: i % 2 === 0 ? "expired" : "destroyed" }),
      })).then((r) => r.json() as Promise<{ ended: boolean }>)));
      expect(endings.filter((r) => r.ended)).toHaveLength(1);
      expect(await hasAllowance("ending-world")).toBeNull();
      expect((await lease(next)).status).toBe(201);
      await insertAllowance("next-world");
      await Promise.all(Array.from({ length: 8 }, () => door(`/${id}`, "DELETE")));
      expect((await liveWorlds()).worlds.map((w) => w.id)).toEqual([next]);
      expect(await hasAllowance("next-world")).not.toBeNull();
    } finally {
      await door(`/${id}`, "DELETE");
      await door(`/${next}`, "DELETE");
    }
  });

  it("takes marks in the admission transaction when creation races an ending", { timeout: 60_000 }, async () => {
    for (let i = 0; i < 6; i++) {
      const old = `handover-old-${i}`;
      const next = `handover-next-${i}`;
      const row = `handover-row-${i}`;
      try {
        expect((await lease(old)).status).toBe(201);
        await insertAllowance(`handover-old-row-${i}`);
        const [, admission] = await Promise.all([door(`/${old}`, "DELETE"), lease(next)]);
        expect([201, 409]).toContain(admission.status);
        if (admission.status === 409) expect((await lease(next)).status).toBe(201);
        await insertAllowance(row);
        await door(`/${next}`, "DELETE");
        expect(await hasAllowance(row)).toBeNull();
        expect((await liveWorlds()).worlds).toEqual([]);
      } finally {
        await door(`/${old}`, "DELETE");
        await door(`/${next}`, "DELETE");
      }
    }
  });

  it("refuses a used id, and an additive index upgrade never repairs overlapping legacy leases by deleting data", { timeout: 60_000 }, async () => {
    expect((await lease("used-world")).status).toBe(201);
    await door("/used-world", "DELETE");
    const reused = await lease("used-world");
    expect(reused.status).toBe(409);
    expect(await reused.json()).toEqual({ error: "WorldUsed", id: "used-world" });
    await env.DB.prepare(`DROP INDEX "_worlds_one_live"`).run();
    await env.DB.prepare(`INSERT INTO "_worlds" ("id", "created", "expires", "marks") VALUES
      ('legacy-overlap-a', 1, 9999999999999, '{}'), ('legacy-overlap-b', 1, 9999999999999, '{}')`).run();
    await insertAllowance("legacy-row");
    try {
      await expect(door("")).rejects.toThrow(/UNIQUE constraint failed/);
      const held = await env.DB.prepare(`SELECT id FROM "_worlds" WHERE "ended" IS NULL`).all<{ id: string }>();
      expect(held.results.map((r) => r.id).sort()).toEqual(["legacy-overlap-a", "legacy-overlap-b"]);
      expect(await hasAllowance("legacy-row")).not.toBeNull();
    } finally {
      await env.DB.prepare(`DELETE FROM "_worlds" WHERE "id" IN ('legacy-overlap-a', 'legacy-overlap-b')`).run();
      await env.DB.prepare(`DELETE FROM "allowance" WHERE "id" = 'legacy-row'`).run();
      expect((await door("")).status).toBe(200);
    }
  });

});
