// generated/server: the Worker. Every operation's route wired to its handler in src/, by path; the world's
// front door at /_world/*; the portal at /portal and /_portal/*; D1 tables from the model.
import { Names } from "orthograph/server";
import type { Model, OperationModel } from "@orthograph/compiler";
import type { RenderedFile } from "#modules/names/types.js";
import { callImports, renderHandlerScaffold, wired } from "#modules/handlers/service.js";
import { GENERATED, bindingOf, camel, databaseStores, handlerAt, lines, opVar, pascal, storeFileAt, thingFileAt, toRoot } from "#modules/names/service.js";
import { emptyPath, groupOf, innerFirst, innerOf, notFromOf, peopleOf, worldExports } from "./helpers.ts";
import { clocksOf, renderMigration, renderStoreMigrations, renderWrangler } from "./worker-config.ts";
import { doorsOf } from "./doors.ts";
import { actorOptionOf } from "./actors.ts";
import { rulesByOrigin, staleOf, versioned } from "./versioned.ts";

const main = (model: Model, name: string, empty: boolean): RenderedFile => {
  const ops = Object.values(model.operations);
  const timed = Object.keys(clocksOf(model)).length > 0;
  const actors = Object.values(model.things).some((t) => t.lives === "actor");
  const handled = ops.filter((o) => o.kind === "operation");
  const groups = [...new Set(ops.map((o) => o.thing))];
  const things = Object.values(model.things);
  // The things with rules (G5): their `invariants.ts` is imported, and the store and the runtime are handed each rule under its full name.
  const ruled = things.filter((t) => Object.keys(t.invariants ?? {}).length > 0);
  const rulesOption = ruled.length > 0 ? ", rules" : "";
  const { declaredRules, versionedRules } = rulesByOrigin(ruled);
  // Each mount a served operation came from, imported once: its plugin's handlers run under it (Mount.serving).
  const mounted = [...new Set(handled.flatMap((o) => (o.from.kind !== "app" ? [o.from.mount] : [])))].filter((m) => model.mounts?.[m]);
  const mountVar = (mount: string) => `${camel(mount)}Mount`;
  // Each adapter a `service` role names (M2-auth, fork 3): the runtime reads the role against the mount's name, so the server hands it each mount by name.
  const serviced = [...new Set(ops.flatMap((o) => o.allowed.flatMap((a) => ("service" in a && a.service !== undefined ? [a.service] : []))))].filter((m) => model.mounts?.[m]).sort();
  const doors = doorsOf(model, name, mountVar, [...mounted, ...serviced]);
  const mountsOption = serviced.length > 0 ? ", mounts" : "";
  // The four operations of a thing with versions are the framework's (see versioned.ts): no handler file.
  const framework = (o: OperationModel) => versioned(model, o);
  const served = (o: OperationModel) =>
    framework(o) ? `Versions.handler("${o.verb}", thingIn(${camel(o.thing)}Thing), ${staleOf(o)}${o.move === null ? ", false" : ""})`
    : o.from.kind !== "app" && mounted.includes(o.from.mount) ? `Mount.serving(${mountVar(o.from.mount)}, ${opVar(o)}Handler)` : `${opVar(o)}Handler`;
  // Each declared database store (K3) has a D1 binding of its own, and its own journal and request keys.
  const stores = databaseStores(model);
  const storeOption = stores.length > 0 ? `, stores: [${stores.map((s) => `[${camel(s.name)}Store, env.${bindingOf(s)}]`).join(", ")}]` : "";
  // Counted work and timers: one process's own, or (a world with a clock) the world's, reported to its Durable Object (M8.07).
  const work = timed ? "WorldEntry.work(env, wakes)" : "BusyLive";
  // A world whose clock steps is reset under its requests: every statement of a request is a write section its token holds (M8.07, I2).
  const db = timed ? "WorldEntry.fenced(env, env.DB)" : "env.DB";
  const journal = stores.length > 0 ? `JournalD1.across([${stores.map((s) => `env.${bindingOf(s)}`).join(", ")}])` : "JournalD1.layer";
  const apart = new Set(Object.values(model.things).filter((t) => t.store !== undefined && stores.some((s) => s.name === t.store)).map((t) => t.name));
  const actorOption = actorOptionOf(model);
  const world = (stores.length > 0
    ? `tables: [${Object.values(model.things).filter((t) => !apart.has(t.name)).map((t) => `"${t.name}"`).join(", ")}], stores: [${stores.map((s) => `{ db: env.${bindingOf(s)}, tables: [${Object.values(model.things).filter((t) => t.store === s.name).map((t) => `"${t.name}"`).join(", ")}] }`).join(", ")}]`
    : "tables: tables.map(([, table]) => table)") + actorOption;
  const group = groupOf(ops, empty, timed);
  return {
    path: "generated/server/main.ts",
    scaffold: false,
    content: lines(
      GENERATED,
      "// The Worker: each operation's route runs its handler through the runtime's wrapper; /_world/* goes to the world.",
      `import { Context, Effect, Layer } from "effect";`,
      `import { ManagedRuntime, Tracer } from "effect";`,
      `import { HttpRouter, HttpServer } from "effect/http";`,
      `import { HttpApi, HttpApiBuilder } from "effect/http-api";`,
      `import { SqlClient } from "effect/sql";`,
      `import type { Principal } from "${Names.frontDoor}";`,
      `import { AuthD1, Database, ${doors.any ? "Inbound, " : ""}JournalD1, StoreD1, Telemetry, ${timed ? "WorldEntry, " : ""}toWorld } from "${Names.pkg("host-cloudflare")}";`,
      `import { Auth, Busy, ${timed ? "" : "BusyLive, "}CallTelemetry, ${timed ? "DurableTimers, " : ""}Environment, Handlers, Journal, ${mounted.length > 0 ? "Mount, " : ""}Principals, Reads, Store, ${timed ? "Timers, " : ""}${handled.some(framework) || versionedRules.length > 0 ? "Versions, " : ""}Wire, ${declaredRules.length > 0 ? "invariantsIn, " : ""}thingIn } from "${Names.pkg("language-effect")}";`,
      `import { Mcp, type McpResult, type ShownOperation } from "${Names.pkg("language-effect")}";`,
      `import { Api, Errors } from "../api/src/index.ts";`,
      `import * as portal from "../portal/main.ts";`,
      `import { catalog } from "../mcp/src/index.ts";`,
      ops.map((o) => `import * as ${opVar(o)} from "../api/src/${o.thing}/${o.verb}.ts";`),
      handled.filter((o) => !framework(o)).map((o) => `import ${opVar(o)}Handler from "${handlerAt("generated/server/main.ts", o)}";`),
      empty ? handled.map((o) => `import ${opVar(o)}Blank from "./${emptyPath(o)}";`) : [],
      callImports(model),
      mounted.map((m) => `import ${mountVar(m)} from "${toRoot("generated/server/main.ts")}${model.mounts![m]!.file}";`),
      serviced.filter((m) => !mounted.includes(m)).map((m) => `import ${mountVar(m)} from "${toRoot("generated/server/main.ts")}${model.mounts![m]!.file}";`),
      doors.imports,
      things.map((t) => `import * as ${camel(t.name)}Thing from "${thingFileAt("generated/server/main.ts", t, "thing")}";`),
      declaredRules.map((t) => `import * as ${camel(t.name)}Invariants from "${thingFileAt("generated/server/main.ts", t, "invariants")}";`),
      stores.map((s) => `import ${camel(s.name)}Store from "${storeFileAt("generated/server/main.ts", s)}";`),
      "",
      worldExports(timed, actors),
      "",
      serviced.length > 0 ? ["/** Each adapter's mount by the name it is mounted under: what a `service` role in `allowed` is read against. */", `const mounts = new Map<unknown, string>([${serviced.map((m) => `[${mountVar(m)}, "${m}"]`).join(", ")}]);`, ""] : [],
      // Each inner operation is served before the operations that run it, and handed to them by their step's key (#1079).
      innerFirst(model, ops).map((o) =>
        o.kind === "read"
          ? `const ${opVar(o)}Served = Reads.serve({ name: "${o.name}", read: ${opVar(o)}.declaration${mountsOption} });`
          : `const ${opVar(o)}Served = Handlers.serve({ name: "${o.name}", operation: ${opVar(o)}.declaration, handler: ${served(o)}${notFromOf(model, o)}, codes: Errors.codes${wired(model, o)}${innerOf(model, o, "Served")}${mountsOption} });`),
      empty ? innerFirst(model, handled).map((o) => `const ${opVar(o)}Scaffolded = Handlers.serve({ name: "${o.name}", operation: ${opVar(o)}.declaration, handler: ${opVar(o)}Blank${notFromOf(model, o)}, codes: Errors.codes${wired(model, o)}${innerOf(model, o, "Scaffolded")}${mountsOption} });`) : [],
      "",
      "/** Each thing and its table: a D1 table, or the name its actors go by. */",
      `const tables = [${things.map((t) => `[thingIn(${camel(t.name)}Thing), "${t.name}"]`).join(", ")}] as const;`,
      ruled.length > 0 ? ["", "/** Each rule (G5) under its full name, `<thing>.<rule>`: the store's index refuses a second holder at commit, and the runtime refuses before it. */", `const rules = [${[...declaredRules.map((t) => `...invariantsIn("${t.name}", ${camel(t.name)}Invariants)`), ...versionedRules.map((t) => `...Versions.rulesOf("${t.name}", thingIn(${camel(t.name)}Thing))`)].join(", ")}] as const;`] : [],
      "",
      doors.table,
      "const refusals = Wire.refusals(Errors.wire);",
      "// A refused payload names every field it was refused for, not only the first (#988).",
      "const CallApi = Api.middleware(CallTelemetry).annotate(HttpApi.PayloadParseOptions, { errors: \"all\" });",
      `type Services = SqlClient.SqlClient | Store | Busy | Principals | Journal | Auth${timed ? " | Timers | DurableTimers" : ""};`,
      "",
      "/** Who is calling, then the operation or read, its refusals sent as their wire classes. */",
      "type Run = (payload: never, principal: Principal, request?: string) => Effect.Effect<unknown, unknown, unknown>;",
      "/** Every answer and every refusal is cut by the visibility rule for this caller before it is sent. */",
      "const shown = Wire.shown(Errors.declared);",
      "const call = <P extends object>(served: { readonly run: Run; readonly operation: ShownOperation }, payload: P, headers: Readonly<Record<string, string | undefined>>) =>",
      "  Effect.flatMap(Principals, (principals) => principals.of(headers[\"authorization\"])).pipe(",
      "    Effect.withTracerEnabled(false),",
      "    // The caller's idempotency key: for an operation declared `idempotent: \"request\"`, the same key is one call.",
      "    Effect.flatMap((principal: Principal) => served.run(payload as never, principal, headers[\"idempotency-key\"]).pipe(shown(served, payload, principal))),",
      "    refusals,",
      "  ) as Effect.Effect<never, never, Services>;",
      "",
      groups.map(group).flat(),
      "",
      "export interface Env {",
      "  readonly DB: D1Database;",
      stores.map((s) => `  /** The database of store ${s.name}: its own tables, journal and request keys. */\n  readonly ${bindingOf(s)}: D1Database;`),
      "  readonly WORLD: DurableObjectNamespace;",
      actors ? "  readonly ACTORS: DurableObjectNamespace;" : [],
      "  /** Better Auth's secret, at least 32 characters: fresh per local world, a named secret per environment. */",
      "  readonly AUTH_SECRET: string;",
      doors.env,
      "  readonly OTLP_URL?: string;",
      "  /** The environment's telemetry sinks beside the collector, as JSON: each one's OTLP endpoints and headers. A secret. */",
      "  readonly OTLP_SINKS?: string;",
      "  /** The environment's name, written on every span as `deployment.environment`: `local` for a world of dev or prove. */",
      "  readonly ORTHO_ENVIRONMENT?: string;",
      "  /** Which build this environment runs, set by `ortho env up`; unset for a world made by `ortho dev` or prove. */",
      "  readonly ORTHO_REVISION?: string;",
      "  readonly ORTHO_BUNDLE_SHA256?: string;",
      "  /** The portal's: where the logbook is, which environment this is. Read by `portal.serve`; neither is sent to a browser. */",
      "  readonly ORTHO_LOGBOOK_URL?: string;",
      "  /** `1` in an environment that hosts worlds with lifetimes (a test environment), set by `ortho env up`. */",
      "  readonly ORTHO_WORLDS?: string;",
      "}",
      "",
      "/** Which steps each operation runs, by the operation's name: the server's own record, never in the API package (the caller's contract names no step, K14). */",
      "export const steps = {",
      ops.filter((o) => Object.keys(o.steps).length > 0).map((o) => `  "${o.name}": [${Object.values(o.steps).map((s) => `"${s.name}"`).join(", ")}],`),
      "} as const;",
      "",
      "// Better Auth's own routes at /api/auth/*: the device sign-in of this project's CLI. Same database and secret as the",
      "// layer's instance, so a session either one issues is a person to both.",
      "let routes: ReturnType<typeof AuthD1.make> | undefined;",
      `const routesOf = (env: Env) => (routes ??= AuthD1.make({ db: ${db}, secret: env.AUTH_SECRET, cli: "${name}-cli", worlds: hostsWorlds(env) }));`,
      "",
      "const build = (env: Env) =>",
      "  HttpRouter.toWebHandler(",
      "    HttpApiBuilder.layer(CallApi).pipe(",
      `      Layer.provide([${groups.map((t) => `${pascal(t)}Live`).join(", ")}]),`,
      "      Layer.provideMerge(CallTelemetry.layer),",
      `      Layer.provide([StoreD1.layer({ tables${actors ? ", actors: env.ACTORS" : ""}${storeOption}${peopleOf(model)}${rulesOption} }), ${journal}, ${work}, Layer.succeed(Environment, env.ORTHO_ENVIRONMENT || "local"), AuthD1.layer(AuthD1.make({ db: ${db}, secret: env.AUTH_SECRET, worlds: hostsWorlds(env) }))]),`,
      `      Layer.provideMerge(Database.d1(${db})),`,
      "      Layer.provide(HttpServer.layerServices),",
      "    ),",
      "  );",
      "",
      "// Built once per isolate, from the first request's bindings.",
      "let built: ReturnType<typeof build> | undefined;",
      "",
      "/** The environments of the blueprint that host worlds: those that declare a `lifetime` (D3 #126). */",
      `const WORLD_ENVIRONMENTS: ReadonlyArray<string> = ${JSON.stringify(Object.values(model.environments ?? {}).filter((e) => e.lifetimeMs !== null).map((e) => e.name))};`,
      "",
      "/**",
      " * `/_world/*` (the cast that signs people up with known passwords, the facts, the registry of worlds) answers only where",
      " * worlds live: a world made by `ortho dev` or prove (`local`, or no environment), and an environment that declares a lifetime and",
      " * was started to host worlds. Anywhere else, staging and production included, it is a 404 before any handler runs.",
      " */",
      "const hostsWorlds = (env: Env) =>",
      "  !env.ORTHO_ENVIRONMENT || env.ORTHO_ENVIRONMENT === \"local\" || (env.ORTHO_WORLDS === \"1\" && WORLD_ENVIRONMENTS.includes(env.ORTHO_ENVIRONMENT));",
      "",
      "/** One tool per operation and read: the same served operations as the API, called as the person the access token names. */",
      "const tools = Mcp.tools<Services>({",
      "  catalog,",
      `  served: { ${ops.map((o) => `"${o.name}": ${opVar(o)}Served`).join(", ")} },`,
      "  refusals: { codes: Errors.codes, declared: Errors.declared, table: Errors.refusals },",
      "});",
      "",
      "// The MCP server's own runtime, built once per isolate: the same store, journal, busy count and auth as the API's.",
      "let mcpRuntime: ManagedRuntime.ManagedRuntime<Services, never> | undefined;",
      "const runtimeOf = (env: Env) =>",
      "  (mcpRuntime ??= ManagedRuntime.make(",
      `    Layer.mergeAll(StoreD1.layer({ tables${actors ? ", actors: env.ACTORS" : ""}${storeOption}${peopleOf(model)}${rulesOption} }), ${journal}, ${work}, Layer.succeed(Environment, env.ORTHO_ENVIRONMENT || "local"), AuthD1.layer(AuthD1.make({ db: ${db}, secret: env.AUTH_SECRET, worlds: hostsWorlds(env) }))).pipe(Layer.provideMerge(Database.d1(${db}))),`,
      "  ));",
      "",
      "const TRACEPARENT = /^00-([0-9a-f]{32})-([0-9a-f]{16})-[0-9a-f]{2}$/;",
      "",
      "/** Who is asking at `/mcp`: any credential the identity knows, or an OAuth access token. This door is the agent's, so each is an agent for its person (M2-auth, fork 2). */",
      "const asker = (env: Env, request: Request) =>",
      "  runtimeOf(env).runPromise(Effect.flatMap(Principals, (principals) => principals.of(request.headers.get(\"authorization\") ?? undefined, \"mcp\"))).then((principal) =>",
      "    principal.kind !== \"anonymous\"",
      "      ? { kind: \"asked\" as const, principal }",
      "      : Effect.runPromise(AuthD1.oauth.bearer(routesOf(env), request)).then((who) => (who.kind === \"person\" ? { kind: \"asked\" as const, principal: who.principal } : who)));",
      "",
      "/** `/mcp`: an agent's credential, or a 401 that says where to get one; then the tool call. */",
      "const mcp = (env: Env, request: Request, context: Context.Context<never> | undefined): Promise<Response> =>",
      "  asker(env, request).then((who) => {",
      "    if (who.kind !== \"asked\") {",
      "      const invalid = who.kind === \"invalid\";",
      "      return Response.json({ error: invalid ? \"invalid_token\" : \"unauthorized\" }, { status: 401, headers: { \"www-authenticate\": AuthD1.oauth.challenge(request, invalid ? \"invalid_token\" : undefined) } });",
      "    }",
      "    // The caller's span, when it sent one, is the parent of every span of the call.",
      "    const sent = request.headers.get(\"traceparent\")?.match(TRACEPARENT);",
      "    const parent = sent ? Tracer.externalSpan({ traceId: sent[1]!, spanId: sent[2]!, sampled: true }) : undefined;",
      "    const run = (effect: Effect.Effect<McpResult, never, Services>) => {",
      "      const traced = parent ? Effect.withParentSpan(effect, parent) : effect;",
      "      return runtimeOf(env).runPromise(context ? Effect.provideContext(traced, context) : traced);",
      "    };",
      `    return Mcp.handle({ name: "${name}", version: env.ORTHO_REVISION ?? "0.0.0", tools, principal: who.principal, run }, request);`,
      "  });",
      "",
      // An environment with a stepped or scaled clock (K23): the entry reads its world's instant and runs each request in it (M8.06).
      timed ? ["/** Each request runs in its world's time: `Date` and Effect's `Clock` read the instant its world keeps (stepped and scaled worlds only). */", "export default WorldEntry.entry<Env>({"] : "export default {",
      "  fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {",
      "    // Closed before anything reads it: outside worlds there is no door to cast, to read facts, or to register a world.",
      "    if (new URL(request.url).pathname.startsWith(\"/_world/\") && !hostsWorlds(env)) return Promise.resolve(Response.json({ error: \"not found\" }, { status: 404 }));",
      "    if (new URL(request.url).pathname.startsWith(\"/_world/\")) {",
      `      return toWorld({ worlds: env.WORLD, db: env.DB, ${world}, leases: env.ORTHO_WORLDS === "1" }, request);`,
      "    }",
      "    if (new URL(request.url).pathname === \"/_ortho/bundle\") {",
      "      return env.ORTHO_REVISION && env.ORTHO_BUNDLE_SHA256",
      "        ? Promise.resolve(Response.json({ revision: env.ORTHO_REVISION, sha256: env.ORTHO_BUNDLE_SHA256 }))",
      "        : Promise.resolve(Response.json({ _tag: \"NotAnEnvironment\" }, { status: 404 }));",
      "    }",
      doors.route,
      "    if (portal.owns(new URL(request.url).pathname)) return portal.serve(request, env);",
      timed
        ? "    if (new URL(request.url).pathname.startsWith(\"/api/auth/\")) return WorldEntry.section(env, () => Effect.runPromise(AuthD1.handle(routesOf(env), request)));"
        : "    if (new URL(request.url).pathname.startsWith(\"/api/auth/\")) return Effect.runPromise(AuthD1.handle(routesOf(env), request));",
      "    if (new URL(request.url).pathname.startsWith(\"/.well-known/\")) {",
      "      return Effect.runPromise(AuthD1.oauth.discovery(routesOf(env), request)).then((found) => found ?? Response.json({ error: \"not found\" }, { status: 404 }));",
      "    }",
      "    if (new URL(request.url).pathname === \"/mcp\") {",
      `      return Telemetry.serve({ url: env.OTLP_URL || undefined, sinks: env.OTLP_SINKS, environment: env.ORTHO_ENVIRONMENT, service: "${name}", handler: (req, context) => mcp(env, req, context), waitUntil: (p) => ctx.waitUntil(p) }, request);`,
      "    }",
      "    const app = (built ??= build(env));",
      "    Telemetry.configure({ sinks: env.OTLP_SINKS, environment: env.ORTHO_ENVIRONMENT });",
      `    return Telemetry.serve({ url: env.OTLP_URL || undefined, service: "${name}", handler: app.handler, waitUntil: (p) => ctx.waitUntil(p) }, request);`,
      "  },",
      timed ? "});" : "};",
    ),
  };
};

export const renderServer = (model: Model, name: string, empty = false): ReadonlyArray<RenderedFile> => [
  main(model, name, empty),
  renderWrangler(name, Object.values(model.things).some((t) => t.lives === "actor"), databaseStores(model), clocksOf(model)),
  renderMigration(model),
  ...renderStoreMigrations(model),
  ...(empty ? Object.values(model.operations).filter((o) => o.kind === "operation").map((o) => renderHandlerScaffold(o, `generated/server/${emptyPath(o)}`, model)) : []),
];
