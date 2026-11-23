import { env } from "cloudflare:workers";
import { Schema } from "effect";
import { Blueprint } from "orthograph";
import { describe, expect, it } from "vitest";
import { Inbound } from "./service.ts";
import type { Door } from "./types.ts";

const SECRET = "test-signing-secret";
const note = Blueprint.incoming(Schema.Struct({ id: Schema.Number, text: Schema.String, sender: Schema.Struct({ id: Schema.Number, login: Schema.String }) }), {
  id: (p) => `note:${p.id}`,
  actor: (p) => ({ id: String(p.sender.id), name: p.sender.login, bot: false }),
});
const adapter = Blueprint.adapter({
  description: "A sender of notes.",
  events: { note },
  door: { signing: Blueprint.secret.stored(), verify: { header: "x-sig", prefix: "sha256=", signs: "body" }, event: { header: "x-event" } },
});
const door: Door = { mount: "notes", adapter, events: ["note"], sources: [], secret: "NOTES_WEBHOOK_SIGNING" };

const sign = (body: string, secret = SECRET) =>
  crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
    .then((key) => crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)))
    .then((sig) => `sha256=${Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("")}`);

const post = (body: string, headers: Record<string, string>, method = "POST", mount = "notes") =>
  Inbound.handle({ doors: [door], db: env.DB, secrets: { NOTES_WEBHOOK_SIGNING: SECRET } }, new Request(`http://door/_in/${mount}`, { method, headers, ...(method === "POST" ? { body } : {}) }))
    .then(async (r) => ({ status: r.status, body: (await r.json()) as unknown }));

const payload = (id: number) => JSON.stringify({ id, text: "hi", sender: { id: 7, login: "ann" } });

describe("inbound doors, in workerd", () => {
  it("accepts a signed delivery once, then sees it again by its own identity, whatever else differs", async () => {
    const body = payload(1);
    const headers = { "x-event": "note", "x-sig": await sign(body) };
    expect(await post(body, headers)).toEqual({ status: 200, body: { accepted: true } });
    expect(await post(body, headers)).toEqual({ status: 200, body: { seen: true } });
    const row = await env.DB.prepare(`SELECT "id", "operation", "event", "actor" FROM "_journal" WHERE "id" = 'notes:note:1'`).first<{ id: string; operation: string; event: string; actor: string }>();
    expect(row).toMatchObject({ operation: "in:notes", event: "note" });
    expect(JSON.parse(row!.actor)).toEqual({ id: "7", name: "ann", bot: false });
  });

  it("refuses a wrong, missing or short signature with 401 and writes nothing", async () => {
    const body = payload(2);
    for (const sig of [await sign(body, "another"), "", "sha256=abc", "garbage"]) {
      expect(await post(body, { "x-event": "note", ...(sig === "" ? {} : { "x-sig": sig }) })).toEqual({ status: 401, body: { _tag: "BadSignature" } });
    }
    expect(await env.DB.prepare(`SELECT count(*) AS n FROM "_journal" WHERE "id" = 'notes:note:2'`).first<{ n: number }>()).toEqual({ n: 0 });
  });

  it("ignores an event it does not take, answers 404 for another mount and 405 for another method", async () => {
    const body = payload(3);
    expect(await post(body, { "x-event": "other", "x-sig": await sign(body) })).toEqual({ status: 200, body: { ignored: true } });
    expect((await post(body, {}, "POST", "nowhere")).status).toBe(404);
    expect((await post(body, {}, "GET")).status).toBe(405);
  });
});
