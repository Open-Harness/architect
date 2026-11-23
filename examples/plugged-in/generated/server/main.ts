// Generated from blueprint/projections/server.ts. Do not edit.
// The Worker: each operation's route runs its handler through the runtime's wrapper; /_world/* goes to the world.
import { Context, Effect, Layer } from "effect";
import { ManagedRuntime, Tracer } from "effect";
import { HttpRouter, HttpServer } from "effect/http";
import { HttpApiBuilder } from "effect/http-api";
import { SqlClient } from "effect/sql";
import type { Principal } from "orthograph";
import { AuthD1, Database, JournalD1, StoreD1, Telemetry, toWorld } from "@orthograph/host-cloudflare";
import { Auth, Busy, BusyLive, CallTelemetry, Environment, Handlers, Journal, Principals, Reads, Store, Wire, invariantsIn, thingIn } from "@orthograph/language-effect";
import { Mcp, type McpResult, type ShownOperation } from "@orthograph/language-effect";
import { Api, Errors } from "../api/src/index.ts";
import * as portal from "../portal/main.ts";
import { catalog } from "../mcp/src/index.ts";
import * as handleClaim from "../api/src/handle/claim.ts";
import * as handleRelease from "../api/src/handle/release.ts";
import * as handleResolve from "../api/src/handle/resolve.ts";
import * as linkAdd from "../api/src/link/add.ts";
import * as linkOrder from "../api/src/link/order.ts";
import * as linkRemove from "../api/src/link/remove.ts";
import * as profileGet from "../api/src/profile/get.ts";
import handleClaimHandler from "../../src/handle/claim.ts";
import handleReleaseHandler from "../../src/handle/release.ts";
import handleResolveHandler from "../../src/handle/resolve.ts";
import linkAddHandler from "../../src/link/add.ts";
import linkOrderHandler from "../../src/link/order.ts";
import linkRemoveHandler from "../../src/link/remove.ts";
import profileGetHandler from "../../src/profile/get.ts";
import * as handleThing from "../../blueprint/things/handle/thing.ts";
import * as linkThing from "../../blueprint/things/link/thing.ts";
import * as profileThing from "../../blueprint/things/profile/thing.ts";
import * as handleInvariants from "../../blueprint/things/handle/invariants.ts";
import * as profileInvariants from "../../blueprint/things/profile/invariants.ts";

export { World } from "@orthograph/host-cloudflare";

const handleClaimServed = Handlers.serve({ name: "handle.claim", operation: handleClaim.declaration, handler: handleClaimHandler, invariants: { HandleTaken: "handle.oneHolderPerName", HandleAlreadyOwned: "handle.oneNamePerPerson" }, codes: Errors.codes });
const handleReleaseServed = Handlers.serve({ name: "handle.release", operation: handleRelease.declaration, handler: handleReleaseHandler, notFrom: "HandleNotClaimed", codes: Errors.codes });
const handleResolveServed = Handlers.serve({ name: "handle.resolve", operation: handleResolve.declaration, handler: handleResolveHandler, codes: Errors.codes });
const linkAddServed = Handlers.serve({ name: "link.add", operation: linkAdd.declaration, handler: linkAddHandler, codes: Errors.codes });
const linkOrderServed = Handlers.serve({ name: "link.order", operation: linkOrder.declaration, handler: linkOrderHandler, codes: Errors.codes });
const linkRemoveServed = Handlers.serve({ name: "link.remove", operation: linkRemove.declaration, handler: linkRemoveHandler, notFrom: "LinkNotListed", codes: Errors.codes });
const profileGetServed = Handlers.serve({ name: "profile.get", operation: profileGet.declaration, handler: profileGetHandler, codes: Errors.codes });

/** Each thing and its table: a D1 table, or the name its actors go by. */
const tables = [[thingIn(handleThing), "handle"], [thingIn(linkThing), "link"], [thingIn(profileThing), "profile"]] as const;

/** Each rule (G5) under its full name, `<thing>.<rule>`: the store's index refuses a second holder at commit, and the runtime refuses before it. */
const rules = [...invariantsIn("handle", handleInvariants), ...invariantsIn("profile", profileInvariants)] as const;

const refusals = Wire.refusals(Errors.wire);
const CallApi = Api.middleware(CallTelemetry);
type Services = SqlClient.SqlClient | Store | Busy | Principals | Journal | Auth;

/** Who is calling, then the operation or read, its refusals sent as their wire classes. */
type Run = (payload: never, principal: Principal, request?: string) => Effect.Effect<unknown, unknown, unknown>;
/** Every answer and every refusal is cut by the visibility rule for this caller before it is sent. */
const shown = Wire.shown(Errors.declared);
const call = <P extends object>(served: { readonly run: Run; readonly operation: ShownOperation }, payload: P, headers: Readonly<Record<string, string | undefined>>) =>
  Effect.flatMap(Principals, (principals) => principals.of(headers["authorization"])).pipe(
    Effect.withTracerEnabled(false),
    // The caller's idempotency key: for an operation declared `idempotent: "request"`, the same key is one call.
    Effect.flatMap((principal: Principal) => served.run(payload as never, principal, headers["idempotency-key"]).pipe(shown(served, payload, principal))),
    refusals,
  ) as Effect.Effect<never, never, Services>;

const HandleLive = HttpApiBuilder.group(CallApi, "handle", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth)(yield* Effect.context<Services>());
  return handlers
      .handle("claim", ({ payload, request }) => call(handleClaimServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("release", ({ payload, request }) => call(handleReleaseServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("resolve", ({ payload, request }) => call(handleResolveServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const LinkLive = HttpApiBuilder.group(CallApi, "link", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth)(yield* Effect.context<Services>());
  return handlers
      .handle("add", ({ payload, request }) => call(linkAddServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("order", ({ payload, request }) => call(linkOrderServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("remove", ({ payload, request }) => call(linkRemoveServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const ProfileLive = HttpApiBuilder.group(CallApi, "profile", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth)(yield* Effect.context<Services>());
  return handlers
      .handle("get", ({ payload, request }) => call(profileGetServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));

export interface Env {
  readonly DB: D1Database;
  readonly WORLD: DurableObjectNamespace;
  /** Better Auth's secret, at least 32 characters: fresh per local world, a named secret per environment. */
  readonly AUTH_SECRET: string;
  readonly OTLP_URL?: string;
  /** The environment's telemetry sinks beside the collector, as JSON: each one's OTLP endpoints and headers. A secret. */
  readonly OTLP_SINKS?: string;
  /** The environment's name, written on every span as `deployment.environment`: `local` for a world of dev or prove. */
  readonly ORTHO_ENVIRONMENT?: string;
  /** Which build this environment runs, set by `ortho env up`; unset for a world made by `ortho dev` or prove. */
  readonly ORTHO_REVISION?: string;
  readonly ORTHO_BUNDLE_SHA256?: string;
  /** The portal's: where the logbook is, which environment this is. Read by `portal.serve`; neither is sent to a browser. */
  readonly ORTHO_LOGBOOK_URL?: string;
  /** `1` in an environment that hosts worlds with lifetimes (a test environment), set by `ortho env up`. */
  readonly ORTHO_WORLDS?: string;
}

/** Which steps each operation runs, by the operation's name: the server's own record, never in the API package (the caller's contract names no step, K14). */
export const steps = {
  "handle.claim": ["handle.claim.record"],
  "handle.release": ["handle.release.record"],
  "handle.resolve": ["handle.resolve.load"],
  "link.add": ["link.add.load", "link.add.record"],
  "link.order": ["link.order.load", "link.order.record"],
  "link.remove": ["link.remove.record"],
  "profile.get": ["profile.get.load"],
} as const;

// Better Auth's own routes at /api/auth/*: the device sign-in of this project's CLI. Same database and secret as the
// layer's instance, so a session either one issues is a person to both.
let routes: ReturnType<typeof AuthD1.make> | undefined;
const routesOf = (env: Env) => (routes ??= AuthD1.make({ db: env.DB, secret: env.AUTH_SECRET, cli: "plugged-in-cli", worlds: hostsWorlds(env) }));

const build = (env: Env) =>
  HttpRouter.toWebHandler(
    HttpApiBuilder.layer(CallApi).pipe(
      Layer.provide([HandleLive, LinkLive, ProfileLive]),
      Layer.provideMerge(CallTelemetry.layer),
      Layer.provide([StoreD1.layer({ tables, rules }), JournalD1.layer, BusyLive, Layer.succeed(Environment, env.ORTHO_ENVIRONMENT || "local"), AuthD1.layer(AuthD1.make({ db: env.DB, secret: env.AUTH_SECRET, worlds: hostsWorlds(env) }))]),
      Layer.provideMerge(Database.d1(env.DB)),
      Layer.provide(HttpServer.layerServices),
    ),
  );

// Built once per isolate, from the first request's bindings.
let built: ReturnType<typeof build> | undefined;

/** The environments of the blueprint that host worlds: those that declare a `lifetime` (D3 #126). */
const WORLD_ENVIRONMENTS: ReadonlyArray<string> = ["test"];

/**
 * `/_world/*` (the cast that signs people up with known passwords, the facts, the registry of worlds) answers only where
 * worlds live: a world made by `ortho dev` or prove (`local`, or no environment), and an environment that declares a lifetime and
 * was started to host worlds. Anywhere else, staging and production included, it is a 404 before any handler runs.
 */
const hostsWorlds = (env: Env) =>
  !env.ORTHO_ENVIRONMENT || env.ORTHO_ENVIRONMENT === "local" || (env.ORTHO_WORLDS === "1" && WORLD_ENVIRONMENTS.includes(env.ORTHO_ENVIRONMENT));

/** One tool per operation and read: the same served operations as the API, called as the person the access token names. */
const tools = Mcp.tools<Services>({
  catalog,
  served: { "handle.claim": handleClaimServed, "handle.release": handleReleaseServed, "handle.resolve": handleResolveServed, "link.add": linkAddServed, "link.order": linkOrderServed, "link.remove": linkRemoveServed, "profile.get": profileGetServed },
  refusals: { codes: Errors.codes, declared: Errors.declared, table: Errors.refusals },
});

// The MCP server's own runtime, built once per isolate: the same store, journal, busy count and auth as the API's.
let mcpRuntime: ManagedRuntime.ManagedRuntime<Services, never> | undefined;
const runtimeOf = (env: Env) =>
  (mcpRuntime ??= ManagedRuntime.make(
    Layer.mergeAll(StoreD1.layer({ tables, rules }), JournalD1.layer, BusyLive, Layer.succeed(Environment, env.ORTHO_ENVIRONMENT || "local"), AuthD1.layer(AuthD1.make({ db: env.DB, secret: env.AUTH_SECRET, worlds: hostsWorlds(env) }))).pipe(Layer.provideMerge(Database.d1(env.DB))),
  ));

const TRACEPARENT = /^00-([0-9a-f]{32})-([0-9a-f]{16})-[0-9a-f]{2}$/;

/** Who is asking at `/mcp`: any credential the identity knows, or an OAuth access token. This door is the agent's, so each is an agent for its person (M2-auth, fork 2). */
const asker = (env: Env, request: Request) =>
  runtimeOf(env).runPromise(Effect.flatMap(Principals, (principals) => principals.of(request.headers.get("authorization") ?? undefined, "mcp"))).then((principal) =>
    principal.kind !== "anonymous"
      ? { kind: "asked" as const, principal }
      : Effect.runPromise(AuthD1.oauth.bearer(routesOf(env), request)).then((who) => (who.kind === "person" ? { kind: "asked" as const, principal: who.principal } : who)));

/** `/mcp`: an agent's credential, or a 401 that says where to get one; then the tool call. */
const mcp = (env: Env, request: Request, context: Context.Context<never> | undefined): Promise<Response> =>
  asker(env, request).then((who) => {
    if (who.kind !== "asked") {
      const invalid = who.kind === "invalid";
      return Response.json({ error: invalid ? "invalid_token" : "unauthorized" }, { status: 401, headers: { "www-authenticate": AuthD1.oauth.challenge(request, invalid ? "invalid_token" : undefined) } });
    }
    // The caller's span, when it sent one, is the parent of every span of the call.
    const sent = request.headers.get("traceparent")?.match(TRACEPARENT);
    const parent = sent ? Tracer.externalSpan({ traceId: sent[1]!, spanId: sent[2]!, sampled: true }) : undefined;
    const run = (effect: Effect.Effect<McpResult, never, Services>) => {
      const traced = parent ? Effect.withParentSpan(effect, parent) : effect;
      return runtimeOf(env).runPromise(context ? Effect.provideContext(traced, context) : traced);
    };
    return Mcp.handle({ name: "plugged-in", version: env.ORTHO_REVISION ?? "0.0.0", tools, principal: who.principal, run }, request);
  });

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Closed before anything reads it: outside worlds there is no door to cast, to read facts, or to register a world.
    if (new URL(request.url).pathname.startsWith("/_world/") && !hostsWorlds(env)) return Promise.resolve(Response.json({ error: "not found" }, { status: 404 }));
    if (new URL(request.url).pathname.startsWith("/_world/")) {
      return toWorld({ worlds: env.WORLD, db: env.DB, tables: tables.map(([, table]) => table), leases: env.ORTHO_WORLDS === "1" }, request);
    }
    if (new URL(request.url).pathname === "/_ortho/bundle") {
      return env.ORTHO_REVISION && env.ORTHO_BUNDLE_SHA256
        ? Promise.resolve(Response.json({ revision: env.ORTHO_REVISION, sha256: env.ORTHO_BUNDLE_SHA256 }))
        : Promise.resolve(Response.json({ _tag: "NotAnEnvironment" }, { status: 404 }));
    }
    if (portal.owns(new URL(request.url).pathname)) return portal.serve(request, env);
    if (new URL(request.url).pathname.startsWith("/api/auth/")) return Effect.runPromise(AuthD1.handle(routesOf(env), request));
    if (new URL(request.url).pathname.startsWith("/.well-known/")) {
      return Effect.runPromise(AuthD1.oauth.discovery(routesOf(env), request)).then((found) => found ?? Response.json({ error: "not found" }, { status: 404 }));
    }
    if (new URL(request.url).pathname === "/mcp") {
      return Telemetry.serve({ url: env.OTLP_URL || undefined, sinks: env.OTLP_SINKS, environment: env.ORTHO_ENVIRONMENT, service: "plugged-in", handler: (req, context) => mcp(env, req, context), waitUntil: (p) => ctx.waitUntil(p) }, request);
    }
    const app = (built ??= build(env));
    Telemetry.configure({ sinks: env.OTLP_SINKS, environment: env.ORTHO_ENVIRONMENT });
    return Telemetry.serve({ url: env.OTLP_URL || undefined, service: "plugged-in", handler: app.handler, waitUntil: (p) => ctx.waitUntil(p) }, request);
  },
};
