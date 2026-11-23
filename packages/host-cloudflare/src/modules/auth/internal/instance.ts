import { betterAuth } from "better-auth";
import type { AuthInstance, AuthOptions } from "../types.ts";
import { optionsFor } from "./options.ts";
import { SCHEMA } from "./schema.ts";

/** An instance that knows its origin names it, so OAuth's issuer and the MCP resource are that address; else a placeholder. */
const make = (o: AuthOptions, origin: string | undefined) =>
  betterAuth({ ...optionsFor(o.cli ?? "cli", origin), database: o.db, secret: o.secret, baseURL: origin ?? "http://ortho.local" });
export type BetterAuth = ReturnType<typeof make>;

interface Held extends AuthInstance {
  /**
   * Better Auth checks its tables the moment it is made, so it is made only once they exist. With an `origin` (the address a
   * request was reached on) it is the instance whose issuer and MCP resource are that address; without, the one that
   * serves sessions and keys only. Made once each.
   */
  readonly auth: (origin?: string) => Promise<BetterAuth>;
  readonly db: D1Database;
  readonly secret: string;
  readonly worlds: boolean;
}

/** The origins one server answers on are a handful; a caller can't make more (the Host header is the platform's). */
const MAX_ORIGINS = 8;

export const instance = (o: AuthOptions): AuthInstance => {
  let tables: Promise<unknown> | undefined;
  const made = new Map<string, Promise<BetterAuth>>();
  const held: Held = {
    kind: "auth-d1",
    db: o.db,
    secret: o.secret,
    worlds: o.worlds === true,
    auth: (origin) =>
      (tables ??= o.db.batch(SCHEMA.map((s) => o.db.prepare(s)))).then(() => {
        const key = origin ?? "";
        const had = made.get(key);
        if (had) return had;
        if (made.size >= MAX_ORIGINS) made.clear();
        // Better Auth finishes starting up on its first use, and a start that a request leaves unfinished is one the next
        // request waits on forever (found with the MCP route: a first call in a later request hung). So the instance is
        // used once, here, before it is handed out.
        const fresh = make(o, origin);
        const ready = fresh.handler(new Request(`${origin ?? "http://ortho.local"}/api/auth/ok`)).then(() => fresh);
        made.set(key, ready);
        return ready;
      }),
  };
  return held;
};

export const held = (a: AuthInstance) => a as Held;

/** Better Auth's refusals carry the HTTP status they would answer with. */
export const statusOf = (e: unknown): number | undefined =>
  typeof e === "object" && e !== null && "statusCode" in e && typeof e.statusCode === "number" ? e.statusCode : undefined;
