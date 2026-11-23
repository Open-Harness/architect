// Generated from the blueprint. Do not edit.
// The Worker: each operation's route runs its handler through the runtime's wrapper; /_world/* goes to the world.
import { Context, Effect, Layer } from "effect";
import { ManagedRuntime, Tracer } from "effect";
import { HttpRouter, HttpServer } from "effect/http";
import { HttpApiBuilder } from "effect/http-api";
import { SqlClient } from "effect/sql";
import type { Principal } from "orthograph";
import { AuthD1, Database, JournalD1, StoreD1, Telemetry, toWorld } from "@orthograph/host-cloudflare";
import { Auth, Busy, BusyLive, CallTelemetry, Environment, Handlers, Journal, Principals, Reads, Store, Wire, thingIn } from "@orthograph/language-effect";
import { Mcp, type McpResult, type ShownOperation } from "@orthograph/language-effect";
import { Api, Errors } from "../api/src/index.ts";
import * as portal from "../portal/main.ts";
import { catalog } from "../mcp/src/index.ts";
import * as attentionApprove from "../api/src/attention/approve.ts";
import * as attentionDecline from "../api/src/attention/decline.ts";
import * as attentionList from "../api/src/attention/list.ts";
import * as attentionRaise from "../api/src/attention/raise.ts";
import * as milestoneAdd from "../api/src/milestone/add.ts";
import * as milestoneDrop from "../api/src/milestone/drop.ts";
import * as milestoneList from "../api/src/milestone/list.ts";
import * as missionFinish from "../api/src/mission/finish.ts";
import * as missionGet from "../api/src/mission/get.ts";
import * as missionList from "../api/src/mission/list.ts";
import * as missionOpen from "../api/src/mission/open.ts";
import * as missionPause from "../api/src/mission/pause.ts";
import * as missionResume from "../api/src/mission/resume.ts";
import * as missionStart from "../api/src/mission/start.ts";
import * as missionStop from "../api/src/mission/stop.ts";
import * as missionTasks from "../api/src/mission/tasks.ts";
import * as questionAnswer from "../api/src/question/answer.ts";
import * as questionAsk from "../api/src/question/ask.ts";
import * as questionList from "../api/src/question/list.ts";
import * as questionSpike from "../api/src/question/spike.ts";
import * as runFail from "../api/src/run/fail.ts";
import * as runFinish from "../api/src/run/finish.ts";
import * as runList from "../api/src/run/list.ts";
import * as runReport from "../api/src/run/report.ts";
import * as runStart from "../api/src/run/start.ts";
import * as runStop from "../api/src/run/stop.ts";
import attentionApproveHandler from "../../src/attention/approve.ts";
import attentionDeclineHandler from "../../src/attention/decline.ts";
import attentionRaiseHandler from "../../src/attention/raise.ts";
import milestoneAddHandler from "../../src/milestone/add.ts";
import milestoneDropHandler from "../../src/milestone/drop.ts";
import missionFinishHandler from "../../src/mission/finish.ts";
import missionOpenHandler from "../../src/mission/open.ts";
import missionPauseHandler from "../../src/mission/pause.ts";
import missionResumeHandler from "../../src/mission/resume.ts";
import missionStartHandler from "../../src/mission/start.ts";
import missionStopHandler from "../../src/mission/stop.ts";
import missionTasksHandler from "../../src/mission/tasks.ts";
import questionAnswerHandler from "../../src/question/answer.ts";
import questionAskHandler from "../../src/question/ask.ts";
import questionSpikeHandler from "../../src/question/spike.ts";
import runFailHandler from "../../src/run/fail.ts";
import runFinishHandler from "../../src/run/finish.ts";
import runReportHandler from "../../src/run/report.ts";
import runStartHandler from "../../src/run/start.ts";
import runStopHandler from "../../src/run/stop.ts";
import * as attentionThing from "../../blueprint/things/attention/thing.ts";
import * as milestoneThing from "../../blueprint/things/milestone/thing.ts";
import * as missionThing from "../../blueprint/things/mission/thing.ts";
import * as personThing from "../../blueprint/things/person/thing.ts";
import * as questionThing from "../../blueprint/things/question/thing.ts";
import * as runThing from "../../blueprint/things/run/thing.ts";

export { World } from "@orthograph/host-cloudflare";

const attentionApproveServed = Handlers.serve({ name: "attention.approve", operation: attentionApprove.declaration, handler: attentionApproveHandler, notFrom: "AttentionNotOpen", notFound: { attention: "AttentionNotFound" }, codes: Errors.codes });
const attentionDeclineServed = Handlers.serve({ name: "attention.decline", operation: attentionDecline.declaration, handler: attentionDeclineHandler, notFrom: "AttentionNotOpen", notFound: { attention: "AttentionNotFound" }, codes: Errors.codes });
const attentionListServed = Reads.serve({ name: "attention.list", read: attentionList.declaration });
const attentionRaiseServed = Handlers.serve({ name: "attention.raise", operation: attentionRaise.declaration, handler: attentionRaiseHandler, codes: Errors.codes });
const milestoneAddServed = Handlers.serve({ name: "milestone.add", operation: milestoneAdd.declaration, handler: milestoneAddHandler, codes: Errors.codes });
const milestoneDropServed = Handlers.serve({ name: "milestone.drop", operation: milestoneDrop.declaration, handler: milestoneDropHandler, notFrom: "MilestoneNotActive", notFound: { milestone: "MilestoneNotFound" }, codes: Errors.codes });
const milestoneListServed = Reads.serve({ name: "milestone.list", read: milestoneList.declaration });
const missionFinishServed = Handlers.serve({ name: "mission.finish", operation: missionFinish.declaration, handler: missionFinishHandler, notFrom: "MissionNotIntake", codes: Errors.codes });
const missionGetServed = Reads.serve({ name: "mission.get", read: missionGet.declaration });
const missionListServed = Reads.serve({ name: "mission.list", read: missionList.declaration });
const missionOpenServed = Handlers.serve({ name: "mission.open", operation: missionOpen.declaration, handler: missionOpenHandler, codes: Errors.codes });
const missionPauseServed = Handlers.serve({ name: "mission.pause", operation: missionPause.declaration, handler: missionPauseHandler, notFrom: "MissionNotIntake", codes: Errors.codes });
const missionResumeServed = Handlers.serve({ name: "mission.resume", operation: missionResume.declaration, handler: missionResumeHandler, notFrom: "MissionNotIntake", codes: Errors.codes });
const missionStartServed = Handlers.serve({ name: "mission.start", operation: missionStart.declaration, handler: missionStartHandler, notFrom: "MissionNotIntake", codes: Errors.codes });
const missionStopServed = Handlers.serve({ name: "mission.stop", operation: missionStop.declaration, handler: missionStopHandler, notFrom: "MissionNotIntake", codes: Errors.codes });
const missionTasksServed = Handlers.serve({ name: "mission.tasks", operation: missionTasks.declaration, handler: missionTasksHandler, codes: Errors.codes });
const questionAnswerServed = Handlers.serve({ name: "question.answer", operation: questionAnswer.declaration, handler: questionAnswerHandler, notFrom: "QuestionNotAsked", notFound: { question: "QuestionNotFound" }, codes: Errors.codes });
const questionAskServed = Handlers.serve({ name: "question.ask", operation: questionAsk.declaration, handler: questionAskHandler, codes: Errors.codes });
const questionListServed = Reads.serve({ name: "question.list", read: questionList.declaration });
const questionSpikeServed = Handlers.serve({ name: "question.spike", operation: questionSpike.declaration, handler: questionSpikeHandler, notFrom: "QuestionNotAsked", notFound: { question: "QuestionNotFound" }, codes: Errors.codes });
const runFailServed = Handlers.serve({ name: "run.fail", operation: runFail.declaration, handler: runFailHandler, notFrom: "RunNotRunning", notFound: { run: "RunNotFound" }, codes: Errors.codes });
const runFinishServed = Handlers.serve({ name: "run.finish", operation: runFinish.declaration, handler: runFinishHandler, notFrom: "RunNotRunning", notFound: { run: "RunNotFound" }, codes: Errors.codes });
const runListServed = Reads.serve({ name: "run.list", read: runList.declaration });
const runReportServed = Handlers.serve({ name: "run.report", operation: runReport.declaration, handler: runReportHandler, notFrom: "RunNotRunning", notFound: { run: "RunNotFound" }, codes: Errors.codes });
const runStartServed = Handlers.serve({ name: "run.start", operation: runStart.declaration, handler: runStartHandler, codes: Errors.codes });
const runStopServed = Handlers.serve({ name: "run.stop", operation: runStop.declaration, handler: runStopHandler, notFrom: "RunNotRunning", notFound: { run: "RunNotFound" }, codes: Errors.codes });

/** Each thing and its table: a D1 table, or the name its actors go by. */
const tables = [[thingIn(attentionThing), "attention"], [thingIn(milestoneThing), "milestone"], [thingIn(missionThing), "mission"], [thingIn(personThing), "person"], [thingIn(questionThing), "question"], [thingIn(runThing), "run"]] as const;

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

const AttentionLive = HttpApiBuilder.group(CallApi, "attention", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth)(yield* Effect.context<Services>());
  return handlers
      .handle("approve", ({ payload, request }) => call(attentionApproveServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("decline", ({ payload, request }) => call(attentionDeclineServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("list", ({ payload, request }) => call(attentionListServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("raise", ({ payload, request }) => call(attentionRaiseServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const MilestoneLive = HttpApiBuilder.group(CallApi, "milestone", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth)(yield* Effect.context<Services>());
  return handlers
      .handle("add", ({ payload, request }) => call(milestoneAddServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("drop", ({ payload, request }) => call(milestoneDropServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("list", ({ payload, request }) => call(milestoneListServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const MissionLive = HttpApiBuilder.group(CallApi, "mission", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth)(yield* Effect.context<Services>());
  return handlers
      .handle("finish", ({ payload, request }) => call(missionFinishServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("get", ({ payload, request }) => call(missionGetServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("list", ({ payload, request }) => call(missionListServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("open", ({ payload, request }) => call(missionOpenServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("pause", ({ payload, request }) => call(missionPauseServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("resume", ({ payload, request }) => call(missionResumeServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("start", ({ payload, request }) => call(missionStartServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("stop", ({ payload, request }) => call(missionStopServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("tasks", ({ payload, request }) => call(missionTasksServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const QuestionLive = HttpApiBuilder.group(CallApi, "question", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth)(yield* Effect.context<Services>());
  return handlers
      .handle("answer", ({ payload, request }) => call(questionAnswerServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("ask", ({ payload, request }) => call(questionAskServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("list", ({ payload, request }) => call(questionListServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("spike", ({ payload, request }) => call(questionSpikeServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const RunLive = HttpApiBuilder.group(CallApi, "run", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth)(yield* Effect.context<Services>());
  return handlers
      .handle("fail", ({ payload, request }) => call(runFailServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("finish", ({ payload, request }) => call(runFinishServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("list", ({ payload, request }) => call(runListServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("report", ({ payload, request }) => call(runReportServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("start", ({ payload, request }) => call(runStartServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("stop", ({ payload, request }) => call(runStopServed, payload, request.headers).pipe(Effect.provideContext(services)));
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
  "attention.approve": ["attention.approve.record"],
  "attention.decline": ["attention.decline.record"],
  "attention.raise": ["attention.raise.insert"],
  "milestone.add": ["milestone.add.insert"],
  "milestone.drop": ["milestone.drop.record"],
  "mission.finish": ["mission.finish.record"],
  "mission.open": ["mission.open.insert"],
  "mission.pause": ["mission.pause.record"],
  "mission.resume": ["mission.resume.record"],
  "mission.start": ["mission.start.record"],
  "mission.stop": ["mission.stop.record"],
  "mission.tasks": ["mission.tasks.plan", "mission.tasks.facts"],
  "question.answer": ["question.answer.record"],
  "question.ask": ["question.ask.insert"],
  "question.spike": ["question.spike.record"],
  "run.fail": ["run.fail.record"],
  "run.finish": ["run.finish.record"],
  "run.report": ["run.report.record"],
  "run.start": ["run.start.claim"],
  "run.stop": ["run.stop.record"],
} as const;

// Better Auth's own routes at /api/auth/*: the device sign-in of this project's CLI. Same database and secret as the
// layer's instance, so a session either one issues is a person to both.
let routes: ReturnType<typeof AuthD1.make> | undefined;
const routesOf = (env: Env) => (routes ??= AuthD1.make({ db: env.DB, secret: env.AUTH_SECRET, cli: "work-cli", worlds: hostsWorlds(env) }));

const build = (env: Env) =>
  HttpRouter.toWebHandler(
    HttpApiBuilder.layer(CallApi).pipe(
      Layer.provide([AttentionLive, MilestoneLive, MissionLive, QuestionLive, RunLive]),
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
  served: { "attention.approve": attentionApproveServed, "attention.decline": attentionDeclineServed, "attention.list": attentionListServed, "attention.raise": attentionRaiseServed, "milestone.add": milestoneAddServed, "milestone.drop": milestoneDropServed, "milestone.list": milestoneListServed, "mission.finish": missionFinishServed, "mission.get": missionGetServed, "mission.list": missionListServed, "mission.open": missionOpenServed, "mission.pause": missionPauseServed, "mission.resume": missionResumeServed, "mission.start": missionStartServed, "mission.stop": missionStopServed, "mission.tasks": missionTasksServed, "question.answer": questionAnswerServed, "question.ask": questionAskServed, "question.list": questionListServed, "question.spike": questionSpikeServed, "run.fail": runFailServed, "run.finish": runFinishServed, "run.list": runListServed, "run.report": runReportServed, "run.start": runStartServed, "run.stop": runStopServed },
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
    return Mcp.handle({ name: "work", version: env.ORTHO_REVISION ?? "0.0.0", tools, principal: who.principal, run }, request);
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
      return Telemetry.serve({ url: env.OTLP_URL || undefined, sinks: env.OTLP_SINKS, environment: env.ORTHO_ENVIRONMENT, service: "work", handler: (req, context) => mcp(env, req, context), waitUntil: (p) => ctx.waitUntil(p) }, request);
    }
    const app = (built ??= build(env));
    Telemetry.configure({ sinks: env.OTLP_SINKS, environment: env.ORTHO_ENVIRONMENT });
    return Telemetry.serve({ url: env.OTLP_URL || undefined, service: "work", handler: app.handler, waitUntil: (p) => ctx.waitUntil(p) }, request);
  },
};
