import { Effect } from "effect";
import { AuthD1 } from "#modules/auth/service.js";
import type { AuthInstance, CastMember } from "#modules/auth/types.js";
import type { Cast } from "../types.ts";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const strings = (v: unknown) => (Array.isArray(v) ? v.filter((n): n is string => typeof n === "string") : []);

/** The world's front door, over its own SQLite storage. */
export const RESET_HEADER = "x-ortho-world";

export const frontDoor = (sql: SqlStorage, auth: AuthInstance, request: Request, nonce?: string): Effect.Effect<Response> =>
  Effect.gen(function* () {
    const path = new URL(request.url).pathname;
    if (path === "/_world/health") return json({ ok: true, ...(nonce ? { nonce } : {}) });
    if (path === "/_world/cast" && request.method === "POST") {
      const body = (yield* Effect.promise(() => request.json().catch(() => ({})))) as { readonly names?: unknown; readonly anonymous?: unknown };
      const anonymous = new Set(strings(body.anonymous));
      const cast: Record<string, CastMember> = {};
      for (const name of [...strings(body.names), ...anonymous]) {
        const row = sql.exec<{ person: string | null; email: string; password: string }>("SELECT person, email, password FROM cast WHERE name = ?", name).toArray()[0];
        const stored = row ? { email: row.email, password: row.password, ...(row.person ? { person: row.person } : {}) } : undefined;
        const member = yield* AuthD1.castMember(auth, name, anonymous.has(name), stored);
        sql.exec("INSERT OR REPLACE INTO cast (name, person, email, password) VALUES (?, ?, ?, ?)", name, member.person ?? null, member.email, member.password);
        cast[name] = member;
      }
      return json(cast satisfies Cast);
    }
    if (path === "/_world/credential" && request.method === "POST") {
      // A credential for one cast member's way in, or for the system or a service: `{ name, via }`, `{ system: true }` or `{ service }`.
      const body = (yield* Effect.promise(() => request.json().catch(() => ({})))) as { readonly name?: unknown; readonly via?: unknown; readonly system?: unknown; readonly service?: unknown };
      if (body.system === true) return json(yield* AuthD1.credential(auth, { kind: "system" }));
      if (typeof body.service === "string") return json(yield* AuthD1.credential(auth, { kind: "service", mount: body.service }));
      const name = typeof body.name === "string" ? body.name : "";
      const row = sql.exec<{ person: string | null; email: string; password: string }>("SELECT person, email, password FROM cast WHERE name = ?", name).toArray()[0];
      if (!row?.person) return json({ error: `${name || "no one"} is not a signed-up member of this world's cast` }, 404);
      if (body.via === "session") {
        const member = yield* AuthD1.castMember(auth, name, false, { email: row.email, password: row.password, person: row.person });
        return json({ token: member.token });
      }
      if (body.via === "key" || body.via === "agent") return json(yield* AuthD1.credential(auth, { kind: body.via, person: row.person }));
      return json({ error: `a world mints no credential for the way in ${JSON.stringify(body.via ?? null)}` }, 400);
    }
    if (path === "/_world/reset" && request.method === "POST") {
      if (nonce && request.headers.get(RESET_HEADER) !== nonce) return json({ error: "not this world's reset" }, 403);
      // The cast stays (a warm world's population); the Worker empties the databases around the people it names.
      return json({ people: sql.exec<{ person: string }>("SELECT person FROM cast WHERE person IS NOT NULL").toArray().map((r) => r.person) });
    }
    return json({ error: "not a door the world has" }, 404);
  });
