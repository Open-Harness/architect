// Planted fixture (evals/who-may-call). Replaces generated/server/main.ts entirely when installed. It is the generated main.ts with only the gate removed (marked PLANTED below).
// The Worker: each operation's route runs its handler through the runtime's wrapper; /_world/* goes to the world.
import { Context, Effect, Layer } from "effect";
import { ManagedRuntime, Tracer } from "effect";
import { HttpRouter, HttpServer } from "effect/http";
import { HttpApi, HttpApiBuilder } from "effect/http-api";
import { SqlClient } from "effect/sql";
import { Blueprint, type Principal } from "orthograph";
import { AuthD1, Database, JournalD1, StoreD1, Telemetry, toWorld } from "@orthograph/host-cloudflare";
import { Auth, Busy, BusyLive, CallTelemetry, Environment, Handlers, Journal, Principals, Reads, Store, Wire, thingIn } from "@orthograph/language-effect";
import { Mcp, type McpResult, type ShownOperation } from "@orthograph/language-effect";
import { Api, Errors } from "../api/src/index.ts";
import * as portal from "../portal/main.ts";
import { catalog } from "../mcp/src/index.ts";
import * as allowanceGet from "../api/src/allowance/get.ts";
import * as allowanceGrant from "../api/src/allowance/grant.ts";
import * as allowanceRevoke from "../api/src/allowance/revoke.ts";
import * as allowanceSpend from "../api/src/allowance/spend.ts";
import * as apiKeyCreate from "../api/src/api-key/create.ts";
import * as invitationAccept from "../api/src/invitation/accept.ts";
import * as invitationRevoke from "../api/src/invitation/revoke.ts";
import * as invitationSend from "../api/src/invitation/send.ts";
import * as membershipGet from "../api/src/membership/get.ts";
import * as organizationCreate from "../api/src/organization/create.ts";
import * as organizationGet from "../api/src/organization/get.ts";
import * as personSignUp from "../api/src/person/sign-up.ts";
import * as sessionShow from "../api/src/session/show.ts";
import * as sessionSignIn from "../api/src/session/sign-in.ts";
import * as systemHealth from "../api/src/system/health.ts";
import allowanceGrantHandler from "../../src/allowance/grant.ts";
import allowanceRevokeHandler from "../../src/allowance/revoke.ts";
import allowanceSpendHandler from "../../src/allowance/spend.ts";
import apiKeyCreateHandler from "../../src/api-key/create.ts";
import invitationAcceptHandler from "../../src/invitation/accept.ts";
import invitationRevokeHandler from "../../src/invitation/revoke.ts";
import invitationSendHandler from "../../src/invitation/send.ts";
import organizationCreateHandler from "../../src/organization/create.ts";
import personSignUpHandler from "../../src/person/sign-up.ts";
import sessionShowHandler from "../../src/session/show.ts";
import sessionSignInHandler from "../../src/session/sign-in.ts";
import systemHealthHandler from "../../src/system/health.ts";
import * as allowanceThing from "../../blueprint/things/allowance/thing.ts";
import * as apiKeyThing from "../../blueprint/things/api-key/thing.ts";
import * as invitationThing from "../../blueprint/things/invitation/thing.ts";
import * as membershipThing from "../../blueprint/things/membership/thing.ts";
import * as organizationThing from "../../blueprint/things/organization/thing.ts";
import * as personThing from "../../blueprint/things/person/thing.ts";
import * as sessionThing from "../../blueprint/things/session/thing.ts";
import * as systemThing from "../../blueprint/things/system/thing.ts";

export { World } from "@orthograph/host-cloudflare";

const allowanceGetServed = Reads.serve({ name: "allowance.get", read: allowanceGet.declaration });
// PLANTED: the server's gate is removed. grant is served with a declaration that lets anyone call, so bob reaches the handler.
const allowanceGrantServed = Handlers.serve({ name: "allowance.grant", operation: { ...allowanceGrant.declaration, allowed: [Blueprint.anyone] }, handler: allowanceGrantHandler, notFound: { member: "PersonNotFound" }, codes: Errors.codes });
const allowanceRevokeServed = Handlers.serve({ name: "allowance.revoke", operation: allowanceRevoke.declaration, handler: allowanceRevokeHandler, notFrom: "AllowanceNotActive", codes: Errors.codes });
const allowanceSpendServed = Handlers.serve({ name: "allowance.spend", operation: allowanceSpend.declaration, handler: allowanceSpendHandler, notFrom: "AllowanceNotActive", codes: Errors.codes });
const apiKeyCreateServed = Handlers.serve({ name: "api-key.create", operation: apiKeyCreate.declaration, handler: apiKeyCreateHandler, codes: Errors.codes });
const invitationAcceptServed = Handlers.serve({ name: "invitation.accept", operation: invitationAccept.declaration, handler: invitationAcceptHandler, notFrom: "InvitationNotPending", codes: Errors.codes });
const invitationRevokeServed = Handlers.serve({ name: "invitation.revoke", operation: invitationRevoke.declaration, handler: invitationRevokeHandler, notFrom: "InvitationNotPending", codes: Errors.codes });
const invitationSendServed = Handlers.serve({ name: "invitation.send", operation: invitationSend.declaration, handler: invitationSendHandler, codes: Errors.codes });
const membershipGetServed = Reads.serve({ name: "membership.get", read: membershipGet.declaration });
const organizationCreateServed = Handlers.serve({ name: "organization.create", operation: organizationCreate.declaration, handler: organizationCreateHandler, codes: Errors.codes });
const organizationGetServed = Reads.serve({ name: "organization.get", read: organizationGet.declaration });
const personSignUpServed = Handlers.serve({ name: "person.sign-up", operation: personSignUp.declaration, handler: personSignUpHandler, codes: Errors.codes });
const sessionShowServed = Handlers.serve({ name: "session.show", operation: sessionShow.declaration, handler: sessionShowHandler, codes: Errors.codes });
const sessionSignInServed = Handlers.serve({ name: "session.sign-in", operation: sessionSignIn.declaration, handler: sessionSignInHandler, codes: Errors.codes });
const systemHealthServed = Handlers.serve({ name: "system.health", operation: systemHealth.declaration, handler: systemHealthHandler, codes: Errors.codes });

/** Each thing and its table: a D1 table, or the name its actors go by. */
const tables = [[thingIn(allowanceThing), "allowance"], [thingIn(apiKeyThing), "api-key"], [thingIn(invitationThing), "invitation"], [thingIn(membershipThing), "membership"], [thingIn(organizationThing), "organization"], [thingIn(personThing), "person"], [thingIn(sessionThing), "session"], [thingIn(systemThing), "system"]] as const;

const refusals = Wire.refusals(Errors.wire);
// A refused payload names every field it was refused for, not only the first (#988).
const CallApi = Api.middleware(CallTelemetry).annotate(HttpApi.PayloadParseOptions, { errors: "all" });
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

const AllowanceLive = HttpApiBuilder.group(CallApi, "allowance", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth)(yield* Effect.context<Services>());
  return handlers
      .handle("get", ({ payload, request }) => call(allowanceGetServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("grant", ({ payload, request }) => call(allowanceGrantServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("revoke", ({ payload, request }) => call(allowanceRevokeServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("spend", ({ payload, request }) => call(allowanceSpendServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const ApiKeyLive = HttpApiBuilder.group(CallApi, "api-key", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth)(yield* Effect.context<Services>());
  return handlers
      .handle("create", ({ payload, request }) => call(apiKeyCreateServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const InvitationLive = HttpApiBuilder.group(CallApi, "invitation", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth)(yield* Effect.context<Services>());
  return handlers
      .handle("accept", ({ payload, request }) => call(invitationAcceptServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("revoke", ({ payload, request }) => call(invitationRevokeServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("send", ({ payload, request }) => call(invitationSendServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const MembershipLive = HttpApiBuilder.group(CallApi, "membership", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth)(yield* Effect.context<Services>());
  return handlers
      .handle("get", ({ payload, request }) => call(membershipGetServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const OrganizationLive = HttpApiBuilder.group(CallApi, "organization", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth)(yield* Effect.context<Services>());
  return handlers
      .handle("create", ({ payload, request }) => call(organizationCreateServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("get", ({ payload, request }) => call(organizationGetServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const PersonLive = HttpApiBuilder.group(CallApi, "person", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth)(yield* Effect.context<Services>());
  return handlers
      .handle("sign-up", ({ payload, request }) => call(personSignUpServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const SessionLive = HttpApiBuilder.group(CallApi, "session", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth)(yield* Effect.context<Services>());
  return handlers
      .handle("show", ({ payload, request }) => call(sessionShowServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("sign-in", ({ payload, request }) => call(sessionSignInServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const SystemLive = HttpApiBuilder.group(CallApi, "system", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth)(yield* Effect.context<Services>());
  return handlers
      .handle("health", ({ payload, request }) => call(systemHealthServed, payload, request.headers).pipe(Effect.provideContext(services)));
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

// Better Auth's own routes at /api/auth/*: the device sign-in of this project's CLI. Same database and secret as the
// layer's instance, so a session either one issues is a person to both.
let routes: ReturnType<typeof AuthD1.make> | undefined;
const routesOf = (env: Env) => (routes ??= AuthD1.make({ db: env.DB, secret: env.AUTH_SECRET, cli: "acme-cli", worlds: hostsWorlds(env) }));

const build = (env: Env) =>
  HttpRouter.toWebHandler(
    HttpApiBuilder.layer(CallApi).pipe(
      Layer.provide([AllowanceLive, ApiKeyLive, InvitationLive, MembershipLive, OrganizationLive, PersonLive, SessionLive, SystemLive]),
      Layer.provideMerge(CallTelemetry.layer),
      Layer.provide([StoreD1.layer({ tables, people: { thing: thingIn(personThing), table: "auth_user" } }), JournalD1.layer, BusyLive, Layer.succeed(Environment, env.ORTHO_ENVIRONMENT || "local"), AuthD1.layer(AuthD1.make({ db: env.DB, secret: env.AUTH_SECRET, worlds: hostsWorlds(env) }))]),
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
  served: { "allowance.get": allowanceGetServed, "allowance.grant": allowanceGrantServed, "allowance.revoke": allowanceRevokeServed, "allowance.spend": allowanceSpendServed, "api-key.create": apiKeyCreateServed, "invitation.accept": invitationAcceptServed, "invitation.revoke": invitationRevokeServed, "invitation.send": invitationSendServed, "membership.get": membershipGetServed, "organization.create": organizationCreateServed, "organization.get": organizationGetServed, "person.sign-up": personSignUpServed, "session.show": sessionShowServed, "session.sign-in": sessionSignInServed, "system.health": systemHealthServed },
  refusals: { codes: Errors.codes, declared: Errors.declared, table: Errors.refusals },
});

// The MCP server's own runtime, built once per isolate: the same store, journal, busy count and auth as the API's.
let mcpRuntime: ManagedRuntime.ManagedRuntime<Services, never> | undefined;
const runtimeOf = (env: Env) =>
  (mcpRuntime ??= ManagedRuntime.make(
    Layer.mergeAll(StoreD1.layer({ tables, people: { thing: thingIn(personThing), table: "auth_user" } }), JournalD1.layer, BusyLive, Layer.succeed(Environment, env.ORTHO_ENVIRONMENT || "local"), AuthD1.layer(AuthD1.make({ db: env.DB, secret: env.AUTH_SECRET, worlds: hostsWorlds(env) }))).pipe(Layer.provideMerge(Database.d1(env.DB))),
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
    return Mcp.handle({ name: "acme", version: env.ORTHO_REVISION ?? "0.0.0", tools, principal: who.principal, run }, request);
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
      return Telemetry.serve({ url: env.OTLP_URL || undefined, sinks: env.OTLP_SINKS, environment: env.ORTHO_ENVIRONMENT, service: "acme", handler: (req, context) => mcp(env, req, context), waitUntil: (p) => ctx.waitUntil(p) }, request);
    }
    const app = (built ??= build(env));
    Telemetry.configure({ sinks: env.OTLP_SINKS, environment: env.ORTHO_ENVIRONMENT });
    return Telemetry.serve({ url: env.OTLP_URL || undefined, service: "acme", handler: app.handler, waitUntil: (p) => ctx.waitUntil(p) }, request);
  },
};
