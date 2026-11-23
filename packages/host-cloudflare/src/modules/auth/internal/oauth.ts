// OAuth 2.1 for the remote MCP server: what the server needs of Better Auth's provider that its own routes don't answer.
// The metadata the SDK's client discovers (the protected resource, and the path-aware authorization server), the access
// token's check, and the cap on dynamic client registration (D3 #123, #124).
import { Clock, DateTime, Effect } from "effect";
import { createLocalJWKSet, jwtVerify } from "jose";
import { oauthProviderAuthServerMetadata, oauthProviderOpenIdConfigMetadata } from "@better-auth/oauth-provider";
import type { Principal } from "orthograph";
import { held, type BetterAuth } from "./instance.ts";
import { SCOPES, mcpResource } from "./options.ts";
import type { AuthInstance, Bearer } from "../types.ts";

const json = (body: unknown, status = 200, headers: Readonly<Record<string, string>> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });

const issuerOf = (origin: string) => `${origin}/api/auth`;
const resourceMetadata = (origin: string) => `${origin}/.well-known/oauth-protected-resource`;

const originOf = (request: Request) => new URL(request.url).origin;

/** `WWW-Authenticate` for a request with no usable token: where a client finds out how to get one (RFC 9728). */
export const challenge = (request: Request, error?: "invalid_token"): string =>
  `Bearer resource_metadata="${resourceMetadata(originOf(request))}"${error ? `, error="${error}"` : ""}`;

/**
 * The discovery documents, at the paths the SDK's client asks for. Better Auth natively serves only
 * `/api/auth/.well-known/...`, so the path-aware forms (RFC 8414 section 3.1) are answered here. `undefined`: not one of them.
 */
export const discovery = (auth: BetterAuth, request: Request): Effect.Effect<Response | undefined> => {
  const origin = originOf(request);
  const { pathname } = new URL(request.url);
  if (pathname === "/.well-known/oauth-authorization-server/api/auth") return Effect.promise(() => oauthProviderAuthServerMetadata(auth)(request));
  if (pathname === "/.well-known/openid-configuration/api/auth") return Effect.promise(() => oauthProviderOpenIdConfigMetadata(auth)(request));
  if (pathname === "/.well-known/oauth-protected-resource" || pathname === "/.well-known/oauth-protected-resource/mcp") {
    return Effect.succeed(json({ resource: mcpResource(origin), authorization_servers: [issuerOf(origin)], bearer_methods_supported: ["header"], scopes_supported: SCOPES }));
  }
  return Effect.succeed(undefined);
};

/** Who an access token is for. A token proves who; the role check says what they may do. */
export const bearer = (a: AuthInstance, auth: BetterAuth, request: Request): Effect.Effect<Bearer> =>
  Effect.gen(function* () {
    const origin = originOf(request);
    const header = request.headers.get("authorization") ?? "";
    const token = /^bearer /i.test(header) ? header.slice(7).trim() : "";
    if (token === "") return { kind: "none" } satisfies Bearer;
    // Checked here against the same-origin keys: signature, issuer, audience and expiry; no call back to the provider.
        const verified = yield* Effect.tryPromise(() =>
      auth.api.getJwks().then((keys) => { return jwtVerify(token, createLocalJWKSet(keys), { issuer: issuerOf(origin), audience: mcpResource(origin) }); }),
    ).pipe(Effect.option);
        const sub = verified._tag === "Some" ? verified.value.payload.sub : undefined;
    if (typeof sub !== "string") return { kind: "invalid" } satisfies Bearer;
    const user = yield* Effect.promise(() => held(a).db.prepare(`SELECT "email" FROM "auth_user" WHERE "id" = ?`).bind(sub).first<{ email: string }>());
    if (!user) return { kind: "invalid" } satisfies Bearer;
    // The MCP door is the agent's: whoever signed in over OAuth acts for the person it names.
    const principal: Principal = { kind: "agent", person: sub, email: user.email, via: "agent" };
    return { kind: "person", principal } satisfies Bearer;
  });

/** Dynamic registration is open (MCP clients register themselves); how many clients that can make is not. */
export const CLIENT_CAP = 500;
/** A client nobody ever authorized, this old, is cleared to make room. */
const STALE_MS = 24 * 60 * 60 * 1000;

export const isRegistration = (request: Request) => request.method === "POST" && new URL(request.url).pathname === "/api/auth/oauth2/register";

/**
 * Before Better Auth sees a registration: clear the clients nobody ever authorized and that are a day old, then refuse
 * (429, `temporarily_unavailable`) when `CLIENT_CAP` remain. `undefined`: go ahead.
 */
export const registrationGuard = (a: AuthInstance): Effect.Effect<Response | undefined> =>
  Effect.gen(function* () {
    const { db } = held(a);
    const before = DateTime.formatIso(DateTime.makeUnsafe((yield* Clock.currentTimeMillis) - STALE_MS));
    const [, counted] = yield* Effect.promise(() =>
      db.batch([
        db.prepare(
          `DELETE FROM "auth_oauth_client" WHERE "createdAt" < ? AND "clientId" NOT IN (SELECT "clientId" FROM "auth_oauth_consent") AND "clientId" NOT IN (SELECT "clientId" FROM "auth_oauth_access_token") AND "clientId" NOT IN (SELECT "clientId" FROM "auth_oauth_refresh_token")`,
        ).bind(before),
        db.prepare(`SELECT COUNT(*) AS n FROM "auth_oauth_client"`),
      ]),
    );
    const n = (counted?.results[0] as { n: number } | undefined)?.n ?? 0;
    return n >= CLIENT_CAP
      ? json({ error: "temporarily_unavailable", error_description: `this server holds ${CLIENT_CAP} registered clients; try again later` }, 429, { "retry-after": "3600" })
      : undefined;
  });
