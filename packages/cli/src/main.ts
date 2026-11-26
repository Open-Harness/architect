#!/usr/bin/env node
// The ortho command. The only file here that reads the process, prints or exits.
import { Names } from "orthograph/server";
import { NodeRuntime, NodeServices } from "@effect/platform-node";
import { Console, Effect, Option } from "effect";
import { Argument, Command, Flag } from "effect/cli";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { Build, Environments, Prove, ProveFailed, Promote, TestWorlds, Verdicts } from "@orthograph/prove";
import { ModelCommand } from "#modules/model/service.js";
import { Add } from "#modules/add/service.js";
import { New } from "#modules/new/service.js";
import { SecretsCommand } from "#modules/secrets/service.js";
import { Mounting } from "#modules/mounting/service.js";
import type { Kind } from "#modules/mounting/types.js";
import { AddRefused, type What } from "#modules/add/types.js";
import { Check } from "#modules/check/service.js";
import { Generate } from "#modules/generate/service.js";
import { Ship } from "#modules/ship/service.js";
import { Brief } from "#modules/brief/service.js";
import { TelemetryCommand } from "#modules/telemetry/service.js";
import { WatchCommand } from "#modules/watch/service.js";
import { proveAddress, stagingLive } from "#modules/staging/service.js";
import { Compiler, nodeSource } from "@orthograph/compiler";

/** `--root`: the app's folder, the current one by default; `what` says what the command does there. */
const rootFlag = (what: string) => Flag.String("root").pipe(Flag.withDefault(process.cwd()), Flag.withDescription(`The app's folder ${what} (the current folder by default)`));

const model = Command.make(
  "model",
  {
    json: Flag.Boolean("json").pipe(Flag.withDefault(false), Flag.withDescription("Print the model as JSON instead of the readable outline")),
    root: rootFlag("whose blueprint is read"),
  },
  ({ json, root }) =>
    ModelCommand.run({ root, json }).pipe(
      Effect.tap((said) => (said.out ? Effect.sync(() => process.stdout.write(said.out)) : Effect.void)),
      Effect.tap((said) => (said.err ? Console.error(said.err.trimEnd()) : Effect.void)),
      Effect.tap((said) => Effect.sync(() => (process.exitCode = said.exit))),
    ),
).pipe(Command.withAlias("describe"), Command.withDescription("Read the blueprint and print the model it declares: things, operations, reads and journeys"));

const dev = Command.make(
  "dev",
  {
    root: rootFlag("to run"),
    port: Flag.Int("port").pipe(Flag.withDefault(8787), Flag.withDescription("The local port the app listens on")),
  },
  ({ root, port }) =>
    Effect.scoped(
      Prove.dev({ root, port, pid: process.pid, env: process.env }).pipe(
        Effect.tap(({ notes }) => Effect.forEach(notes, (n) => Console.log(n))),
        Effect.tap(({ url, log }) => Console.log(`running at ${url}  (world at ${url}/_world, wrangler output in ${log})`)),
        Effect.andThen(Effect.never),
      ),
    ).pipe(Effect.catchTag("ProveFailed", (e) => Console.error(e.message).pipe(Effect.tap(() => Effect.sync(() => (process.exitCode = 1)))))),
).pipe(Command.withDescription("Run the app on this machine, with a local world, until you stop it"));

const fail = (message: string, exit: number) => Console.error(message).pipe(Effect.tap(() => Effect.sync(() => (process.exitCode = exit))));

/** Where the logbook is (ORTHO_LOGBOOK_URL, else the running `logbook` environment) and who signs for the run (D3 #14, #54). */
const attestation = (root: string) =>
  Effect.gen(function* () {
    const token = yield* Verdicts.sourceOf(process.env).pipe(Effect.mapError((e) => e.message));
    const given = process.env[Names.variable("LOGBOOK_URL")];
    const logbook = given ?? (yield* Environments.status({ root, name: "logbook" }).pipe(Effect.map((s) => (s.state === "up" ? s.url : undefined))));
    if (!logbook) return yield* Effect.fail("the logbook isn't running: `ortho env up logbook`, or set ORTHO_LOGBOOK_URL");
    return { token, logbook };
  });

const prove = Command.make(
  "prove",
  {
    env: Flag.Literals("env", ["local", "test", "staging"]).pipe(Flag.withDefault("local"), Flag.withDescription("Where the journeys run: a local world, the test environment, or the deployed staging Worker")),
    root: rootFlag("whose journeys are proved"),
    port: Flag.Int("port").pipe(Flag.withDefault(0), Flag.withDescription("The local port for the app under proof; 0 picks a free one")),
    empty: Flag.Boolean("empty").pipe(Flag.withDefault(false), Flag.withDescription("Run the journeys on the scaffolded handlers, recording no verdict")),
    // The journeys to judge, by name: any number of times with `--env staging` (CX-staging), at most once with `--env local`.
    only: Flag.String("only").pipe(Flag.atLeast(0), Flag.withDescription("Run only the journey with this declared name; repeat it to name several with --env staging")),
    // Only the journeys a change since the last proof's record touches; everything, saying why, when it cannot tell (ST1.23).
    changed: Flag.Boolean("changed").pipe(Flag.withDefault(false), Flag.withDescription("Run only the journeys a change since the last proof touches")),
    // The run as data (per journey, per step: verdict, expected, got, handler and declaration files; totals; timings).
    json: Flag.Boolean("json").pipe(Flag.withDefault(false), Flag.withDescription("Print the run as JSON: each journey and step, with its verdict and timings")),
    report: Flag.String("report").pipe(Flag.optional, Flag.withDescription("Also write the run as JSON to this file")),
    // The run whose deployed Worker is judged (`--env staging` only): the address is formed from it and the account's subdomain.
    run: Flag.String("run").pipe(Flag.optional, Flag.withDescription("With --env staging, the run whose deployed Worker is judged")),
  },
  ({ env, root, port, empty, only, changed, json, report, run }) => {
    if (env !== "staging" && Option.isSome(run)) return fail("--run requires --env staging", 2);
    if (env === "staging" && (empty || changed)) return fail(`${empty ? "--empty" : "--changed"} can't be used with --env staging: it judges the deployed Worker, not a world of its own`, 2);
    if (env === "test" && (empty || only.length > 0)) return fail("--empty and --only require --env local", 2);
    if (env === "local" && only.length > 1) return fail("--only names one journey with --env local; several are judged only with --env staging", 2);
    if (env === "test" && changed) return fail("--changed requires --env local", 2);
    if (changed && (empty || only.length > 0)) return fail("--changed can't be combined with --empty or --only", 2);
    if (env === "test" && (json || Option.isSome(report))) return fail("--json and --report require --env local", 2);
    const proved = env === "staging"
      ? proveAddress({ root, run: Option.getOrUndefined(run), subdomain: process.env[Names.variable("STAGING_SUBDOMAIN")], origin: process.env[Names.variable("STAGING_ORIGIN")] }).pipe(
          Effect.mapError((e) => e.message),
          Effect.flatMap(({ url, label, owns }) => Prove.staged({ root, url, label, ...(process.env["CLOUDFLARE_API_TOKEN"] && process.env["CLOUDFLARE_ACCOUNT_ID"] ? { d1: { token: process.env["CLOUDFLARE_API_TOKEN"], account: process.env["CLOUDFLARE_ACCOUNT_ID"], owns } } : {}), only })),
          Effect.tap((proved) => Effect.sync(() => {
            if (Option.isSome(report)) writeFileSync(report.value, JSON.stringify(proved.structured, null, 2) + "\n");
            process.stdout.write(json ? JSON.stringify(proved.structured, null, 2) + "\n" : proved.lines.join("\n") + "\n");
            process.exitCode = proved.passed ? 0 : 1;
          })),
        )
      : env === "test"
      ? attestation(root).pipe(
          Effect.flatMap(({ token, logbook }) => {
            const lifetime = process.env[Names.variable("LIFETIME")];
            return Prove.test({ root, logbook, token, env: process.env, ...(lifetime ? { lifetime } : {}), say: (line) => Console.log(line) });
          }),
          Effect.tap((report) => Effect.sync(() => (process.exitCode = report.passed ? 0 : 1))),
          Effect.catchTag("EnvironmentFailed", (e) => Effect.fail(new ProveFailed({ message: e.message }))),
        )
      : Effect.scoped(Prove.run({ root, port, empty, changed, env: process.env, ...(changed && !json ? { say: (line: string) => Console.log(line) } : {}), ...(only[0] !== undefined ? { only: only[0] } : {}) })).pipe(
          Effect.tap((proved) => Effect.sync(() => {
            if (Option.isSome(report)) writeFileSync(report.value, JSON.stringify(proved.structured, null, 2) + "\n");
            process.stdout.write(json ? JSON.stringify(proved.structured, null, 2) + "\n" : proved.lines.slice(proved.said ?? 0).join("\n") + "\n");
          })),
          Effect.tap((proved) => Effect.sync(() => (process.exitCode = proved.passed ? 0 : 1))),
        );
    return proved.pipe(
      Effect.catchTag("ProveFailed", (e) => Console.error(`prove couldn't run: ${e.message}`).pipe(Effect.tap(() => Effect.sync(() => (process.exitCode = 2))))),
      Effect.catch((message: string) => fail(message, 2)),
    );
  },
).pipe(Command.withDescription("Run the app's journeys against it and say which pass, step by step"));

const print = (said: { readonly out: string; readonly err: string; readonly exit: number }) =>
  Effect.sync(() => {
    if (said.out) process.stdout.write(said.out);
    if (said.err) process.stderr.write(said.err);
    process.exitCode = said.exit;
  });

// `ortho promote --to staging|production`: the exact built bundle, moved on only with the verdicts that earn it (D3 #14, #92).
const promote = Command.make(
  "promote",
  { to: Flag.Literals("to", ["staging", "production"]).pipe(Flag.withDescription("The environment the built bundle moves on to")), root: rootFlag("whose bundle is promoted") },
  ({ to, root }) =>
    Promote.to({ root, env: process.env, target: to, say: (line) => Console.log(line) }).pipe(
      Effect.tap((promoted) => Effect.sync(() => (process.exitCode = promoted.passed ? 0 : 1))),
      Effect.catchTags({
        PromoteRefused: (e) => Console.log(e.lines.join("\n")).pipe(Effect.tap(() => Effect.sync(() => (process.exitCode = 1)))),
        PromoteFailed: (e) => fail(`promote couldn't run: ${e.message}`, 2),
      }),
    ),
).pipe(Command.withDescription("Move the exact built bundle on to staging or production, once its verdicts earn it"));

// `ortho secrets [--env]` lists the declared secrets, names and state only; `ortho secrets set <NAME>` reads the value from stdin and nowhere else (M2.04).
const secretsEnv = Flag.String("env").pipe(Flag.withDefault("local"), Flag.withDescription("The environment whose secrets are listed or set"));
const secretsRoot = rootFlag("whose declared secrets are used");
const secretsSet = Command.make(
  "set",
  { name: Argument.String("name").pipe(Argument.withDescription("The declared secret to set, such as AUTH_SECRET")), env: secretsEnv, root: secretsRoot },
  ({ name, env, root }) =>
    (process.stdin.isTTY ? Effect.succeed({ out: "", err: `a value is read from stdin, never typed here or put on the command line: printf %s "$VALUE" | ortho secrets set ${name}\n`, exit: 2 })
      : Effect.sync(() => readFileSync(0, "utf8")).pipe(Effect.flatMap((stdin) => SecretsCommand.set({ root, env, name, stdin })))
    ).pipe(Effect.flatMap(print)),
).pipe(Command.withDescription("Store a secret's value, read from stdin and never from the command line"));
const secrets = Command.make(
  "secrets",
  { env: secretsEnv, root: secretsRoot },
  ({ env, root }) => SecretsCommand.list({ root, env }).pipe(Effect.flatMap(print)),
).pipe(Command.withDescription("List the app's declared secrets and whether each has a value, never the values"), Command.withSubcommands([secretsSet]));

// `ortho add <what> <name>`: writes the planned files, or with --dry-run prints them and writes nothing.
const ADD_ONE: Readonly<Record<What, string>> = {
  thing: "Declare a new thing, a kind of record the app keeps, in its own file",
  operation: "Declare a new operation, something a caller asks the app to do, with its empty handler",
  read: "Declare a new read, a question a caller asks of the app's records",
  journey: "Write a new journey file, the story a proof runs step by step",
};
const addOne = (what: What) =>
  Command.make(
    what,
    {
      name: Argument.String("name").pipe(Argument.withDescription(`The new ${what}'s name, in kebab case`)),
      dryRun: Flag.Boolean("dry-run").pipe(Flag.withDefault(false), Flag.withDescription("Print the files it would write, and write nothing")),
      root: rootFlag("to write into"),
    },
    ({ name, dryRun, root }) => {
      const planned = Add.plan(what, name, (path) => existsSync(join(root, path)));
      if (planned instanceof AddRefused) return fail(planned.message, 2);
      return Effect.sync(() => {
        for (const f of planned) {
          if (dryRun) process.stdout.write(`--- ${f.path}\n${f.content}`);
          else {
            mkdirSync(dirname(join(root, f.path)), { recursive: true });
            writeFileSync(join(root, f.path), f.content);
            process.stdout.write(`wrote ${f.path}\n`);
          }
        }
        if (dryRun) process.stdout.write(`(dry run: ${planned.length} files, nothing written)\n`);
      });
    },
  ).pipe(Command.withDescription(ADD_ONE[what]));
// `ortho add feature|adapter|projection <package>`: one mount file, the version pinned exactly, and what it needs.
const ADD_PLUGIN: Readonly<Record<Kind, string>> = {
  feature: "Mount a feature package, such as sign-in, with its version pinned exactly",
  adapter: "Mount an adapter package that talks to an outside service, pinned exactly",
  projection: "Mount a projection package that turns the model into another surface, pinned exactly",
};
const addPlugin = (kind: Kind) =>
  Command.make(
    kind,
    {
      pkg: Argument.String("package").pipe(Argument.withDescription(`The npm package of the ${kind} to mount`)),
      as: Flag.String("as").pipe(Flag.optional, Flag.withDescription("The mount's own name, when not the package's")),
      dryRun: Flag.Boolean("dry-run").pipe(Flag.withDefault(false), Flag.withDescription("Print the mount file it would write, and write nothing")),
      root: rootFlag("to mount it in"),
    },
    ({ pkg, as, dryRun, root }) =>
      Mounting.add({ root, kind, pkg, dryRun, registry: process.env["npm_config_registry"] ?? "https://registry.npmjs.org", ...(Option.isSome(as) ? { as: as.value } : {}) }).pipe(
        Effect.flatMap((added) => Console.log(added.lines.join("\n"))),
        Effect.catchTag("MountRefused", (e) => fail(e.message, 2)),
      ),
  ).pipe(Command.withDescription(ADD_PLUGIN[kind]));
// `ortho add journeys <thing>`: a stub per path, role and declared error, writing only the ones that are missing (K16 e).
const addJourneys = Command.make(
  "journeys",
  { thing: Argument.String("thing").pipe(Argument.withDescription("The declared thing whose journeys are stubbed")), root: rootFlag("whose model is read") },
  ({ thing, root }) =>
    Compiler.model.pipe(
      Effect.provide(nodeSource(root)),
      Effect.flatMap((m) => {
        const planned = Add.journeys(m, thing, (path) => existsSync(join(root, path)));
        if (planned instanceof AddRefused) return fail(planned.message, 2);
        return Effect.sync(() => {
          for (const f of planned.write) {
            mkdirSync(dirname(join(root, f.path)), { recursive: true });
            writeFileSync(join(root, f.path), f.content);
            process.stdout.write(`wrote ${f.path}\n`);
          }
          for (const path of planned.there) process.stdout.write(`kept ${path} (already there)\n`);
        });
      }),
      Effect.catchTags({ BlueprintInvalid: (e) => fail(e.problems.join("\n"), 2), SourceError: (e) => fail(e.message, 2) }),
    ),
).pipe(Command.withDescription("Stub a journey for each path, role and declared error of a thing, keeping those already written"));
const add = Command.make("add").pipe(
  Command.withDescription("Add a declaration, a journey or a plugin to the app"),
  Command.withSubcommands([addOne("thing"), addOne("operation"), addOne("read"), addOne("journey"), addJourneys, addPlugin("feature"), addPlugin("adapter"), addPlugin("projection")]),
);

// `ortho new adapter <name> --from-openapi <file or URL>`: an adapter generated from a service's own API description (M5.07).
const newAdapter = Command.make(
  "adapter",
  {
    name: Argument.String("name").pipe(Argument.withDescription("The new adapter's name, in kebab case")),
    from: Flag.String("from-openapi").pipe(Flag.optional, Flag.withDescription("The OpenAPI description to make it from, a file or a URL")),
    root: rootFlag("to write the adapter into"),
  },
  ({ name, from, root }) =>
    Option.isNone(from)
      ? fail("ortho new adapter needs --from-openapi <file or URL>: the description to make the adapter from", 2)
      : New.adapter({ root, name, from: from.value }).pipe(
          Effect.flatMap((lines) => Console.log(lines.join("\n"))),
          Effect.catchTag("NewRefused", (e) => fail(e.message, 2)),
        ),
).pipe(Command.withDescription("Generate an adapter from a service's own OpenAPI description"));
const newCommand = Command.make("new").pipe(Command.withDescription("Create something new from a source, such as an adapter from an API description"), Command.withSubcommands([newAdapter]));

const tsFiles = (dir: string): ReadonlyArray<string> =>
  existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? tsFiles(join(dir, d.name)) : d.name.endsWith(".ts") ? [join(dir, d.name)] : [])) : [];

const check = Command.make(
  "check",
  { root: rootFlag("to check") },
  ({ root }) =>
    Check.run(root).pipe(
      Effect.tap((said) => Effect.sync(() => {
        process.stdout.write(said.lines.join("\n") + "\n");
        process.exitCode = said.passed ? 0 : 1;
      })),
    ),
).pipe(Command.withDescription("Check the blueprint, the generated files and the code's rules, and list each problem"));

const generate = Command.make(
  "generate",
  { root: rootFlag("to generate into") },
  ({ root }) =>
    Generate.run(root).pipe(
      Effect.tap((changes) => Effect.sync(() => process.stdout.write(Generate.lines(changes).join("\n") + "\n"))),
      Effect.tap(() => Ship.changes({ root, env: process.env })),
      Effect.catchTag("ModelFailed", (e) => fail(e.problems, 2)),
    ),
).pipe(Command.withDescription("Write the generated code from the blueprint: the server, the CLI, the SDK and the MCP"));

// What a change does: the local ledger's lines, and with a logbook the next version and what is stale in staging and production.
const impact = Command.make(
  "impact",
  { root: rootFlag("whose change is weighed") },
  ({ root }) => Ship.impact({ root, env: process.env }).pipe(Effect.flatMap(print)),
).pipe(Command.withDescription("Say what a change does: its ledger lines, the next version and what goes stale"));

// `ortho version --next`: the version the working model would release as, worked out from the last production release.
const version = Command.make(
  "version",
  { next: Flag.Boolean("next").pipe(Flag.withDefault(false), Flag.withDescription("Print the version the working model would release as")), root: rootFlag("whose next version is worked out") },
  ({ next, root }) => (next ? Ship.next({ root, env: process.env }).pipe(Effect.flatMap(print)) : fail("usage: ortho version --next", 2)),
).pipe(Command.withDescription("Work out the app's next release version from the last production release"));

// `ortho telemetry trace <id>`: a trace read from the files a Collector wrote (O1); the portal's trace view is the page for it.
const telemetryEnv = Flag.optional(Flag.String("env").pipe(Flag.withDescription("The environment whose recorded traces are read")));
const telemetry = Command.make("telemetry").pipe(Command.withDescription("Read what the app recorded while it ran"), Command.withSubcommands([
  Command.make(
    "trace",
    { id: Argument.String("id").pipe(Argument.withDescription("The trace's id, as a log line or the portal shows it")), env: telemetryEnv, root: rootFlag("whose traces are read") },
    ({ id, env, root }) => TelemetryCommand.trace({ root, id, ...(Option.isSome(env) ? { env: env.value } : {}) }).pipe(Effect.flatMap(print)),
  ).pipe(Command.withDescription("Print one trace, span by span, from the files a Collector wrote")),
]));

// `ortho watch --env <name>`: the evals telemetry can answer, over what the environment recorded (L2.09, D3 #140).
const watch = Command.make(
  "watch",
  {
    env: Flag.String("env").pipe(Flag.withDescription("The environment whose recordings are judged")),
    source: Flag.Literals("source", ["file", "axiom"]).pipe(Flag.withDefault("file"), Flag.withDescription("Where the recordings are read: local files or Axiom")),
    since: Flag.String("since").pipe(Flag.withDefault("1h"), Flag.withDescription("How far back to look, such as 1h or 30m")),
    root: rootFlag("whose evals are run"),
  },
  ({ env, source, since, root }) => WatchCommand.run({ root, environment: env, source, since, env: process.env }).pipe(Effect.flatMap(print)),
).pipe(Command.withDescription("Run the evals telemetry can answer over what an environment recorded"));

// `ortho publish --dry-run | --local`: the SDK and CLI at the next version (D3 #9, #110). The cloud pass publishes to npmjs.org and GitHub.
const publish = Command.make(
  "publish",
  {
    dryRun: Flag.Boolean("dry-run").pipe(Flag.withDefault(false), Flag.withDescription("Pack the generated SDK and CLI and say what would be published, publishing nothing")),
    local: Flag.Boolean("local").pipe(Flag.withDefault(false), Flag.withDescription("Publish them to the registry npm is set to use, such as a local one")),
    root: rootFlag("whose generated packages are published"),
  },
  ({ dryRun, local, root }) =>
    dryRun || local
      ? Ship.publish({ root, env: process.env, mode: dryRun ? "dry-run" : "local", say: (line) => Console.log(line) }).pipe(Effect.flatMap(print))
      : fail("usage: ortho publish --dry-run | --local (npmjs.org and GitHub releases are the cloud pass's)", 2),
).pipe(Command.withDescription("Publish the app's generated SDK and CLI at the next version"));

const brief = Command.make(
  "brief",
  { operation: Argument.String("operation").pipe(Argument.withDescription("The declared operation to brief a builder on")), root: rootFlag("whose model and journeys are read") },
  ({ operation, root }) =>
    Compiler.model.pipe(
      Effect.provide(nodeSource(root)),
      Effect.flatMap((m) => {
        const journeys = [...tsFiles(join(root, "blueprint/journeys")), ...tsFiles(join(root, "journeys"))]
          .map((f) => ({ path: relative(root, f), text: readFileSync(f, "utf8") }));
        const said = Brief.of(m, operation, journeys);
        return "unknown" in said ? fail(said.unknown, 2) : Effect.sync(() => process.stdout.write(said.lines.join("\n") + "\n"));
      }),
      Effect.catchTags({ BlueprintInvalid: (e) => fail(e.problems.join("\n"), 2), SourceError: (e) => fail(e.message, 2) }),
    ),
).pipe(Command.withDescription("Print what a builder needs to write one operation's handler: its declaration and journeys"));

// `ortho build`: the revision's bundle, once. Every environment runs this file unchanged (D3 #6).
const build = Command.make(
  "build",
  { root: rootFlag("to build") },
  ({ root }) =>
    Build.build(root, process.env).pipe(
      Effect.tap((b) => (b.dirty ? Console.error(`warning: the working tree differs from ${b.revision}, so this bundle is not that commit's source`) : Effect.void)),
      Effect.tap((b) => Console.log(`built ${b.revision} sha256:${b.sha256}`)),
      Effect.catchTag("BuildFailed", (e) => fail(e.message, 2)),
    ),
).pipe(Command.withDescription("Build the revision's bundle once, the file every environment runs unchanged"));

// `ortho env up <env> --plan|--run <id>` and `ortho env destroy <env> --run <id>`: an environment in the cloud (M7.03, M7.04). `--plan` prints what would be made and touches nothing.
// The Cloudflare credentials are read here and nowhere else.
const cloud = (verb: "up" | "destroy", env: string, plan: boolean, run: Option.Option<string>, root: string) => {
  const options = { root, environment: env, run: Option.getOrUndefined(run), credentials: { token: process.env["CLOUDFLARE_API_TOKEN"], account: process.env["CLOUDFLARE_ACCOUNT_ID"] } };
  const api = stagingLive((millis) => Effect.sleep(millis), process.env);
  return (plan ? api.plan(options) : verb === "up" ? api.up(options) : api.destroy(options)).pipe(
    Effect.tap((said) => (said.out ? Effect.sync(() => process.stdout.write(said.out)) : Effect.void)),
    Effect.tap((said) => (said.err ? Console.error(said.err.trimEnd()) : Effect.void)),
    Effect.tap((said) => Effect.sync(() => (process.exitCode = said.exit))),
  );
};

// `ortho env up|down|status <env>`: a long-lived local environment (D3 #4).
const ENV_VERB = {
  up: "Start a long-lived local environment, or with --plan or --run make one in the cloud",
  down: "Stop a long-lived local environment that is running",
  status: "Say whether a long-lived local environment is running, where, and its worlds",
} as const;
const environment = (verb: "up" | "down" | "status") =>
  Command.make(
    verb,
    {
      env: Argument.String("env").pipe(Argument.withDescription("The environment's name, such as test, logbook or staging")),
      port: Flag.optional(Flag.Int("port").pipe(Flag.withDescription("The local port a long-lived environment listens on"))),
      revision: Flag.optional(Flag.String("revision").pipe(Flag.withDescription("The built revision a long-lived environment runs"))),
      plan: Flag.Boolean("plan").pipe(Flag.withDefault(false), Flag.withDescription("Print what would be made in the cloud, and touch nothing")),
      run: Flag.optional(Flag.String("run").pipe(Flag.withDescription("The run whose cloud environment is made"))),
      root: rootFlag("whose environment it is"),
    },
    ({ env, port, revision, plan, run, root }) => {
      // `up` with `--plan` or `--run` is the cloud's (the same plan, printed or made); with neither it stays the long-lived local environment.
      if (verb === "up" && (plan || Option.isSome(run))) return cloud("up", env, plan, run, root);
      const name = { root, name: env };
      // The logbook trusts one issuer, a repository, refs and workflows: from the environment, like a prove's token (D3 #33).
      const list = (text: string | undefined) => (text ?? "").split(",").map((s) => s.trim()).filter((s) => s !== "");
      const [issuer, repository, refs, workflows] = [process.env[Names.variable("OIDC_ISSUER")], process.env[Names.variable("OIDC_REPOSITORY")], list(process.env[Names.variable("OIDC_REF")]), list(process.env[Names.variable("OIDC_WORKFLOW")])];
      const policy = issuer && repository && refs.length > 0 && workflows.length > 0 ? { policy: { issuer, repository, refs, workflows } } : {};
      const logbook = process.env[Names.variable("LOGBOOK_URL")];
      const said =
        verb === "up"
          ? Environments.up({ ...name, ...policy, env: process.env, ...(logbook ? { logbook } : {}), ...(Option.isSome(port) ? { port: port.value } : {}), ...(Option.isSome(revision) ? { revision: revision.value } : {}) }).pipe(Effect.map((s) => [`${env} up ${s.url}`]))
          : verb === "down"
            ? Environments.down(name).pipe(Effect.map(() => [`${env} down`]))
            : Environments.status(name).pipe(
                Effect.flatMap((s) =>
                  s.state === "up"
                    ? TestWorlds.live(s.url).pipe(Effect.map((worlds) => [`${env} up ${s.url}`, ...(worlds === undefined ? [] : [`worlds ${worlds}`])]))
                    : Effect.succeed([`${env} down`]),
                ),
              );
      return said.pipe(Effect.flatMap((lines) => Console.log(lines.join("\n"))), Effect.catchTag("EnvironmentFailed", (e) => fail(e.message, 2)));
    },
  ).pipe(Command.withDescription(ENV_VERB[verb]));
const destroyEnvironment = Command.make(
  "destroy",
  {
    env: Argument.String("env").pipe(Argument.withDescription("The cloud environment's name, such as staging")),
    plan: Flag.Boolean("plan").pipe(Flag.withDefault(false), Flag.withDescription("Print what would be destroyed, and touch nothing")),
    run: Flag.optional(Flag.String("run").pipe(Flag.withDescription("The run whose cloud environment is destroyed"))),
    root: rootFlag("whose environment it is"),
  },
  ({ env, plan, run, root }) => cloud("destroy", env, plan, run, root),
).pipe(Command.withDescription("Destroy a cloud environment a run made, and everything in it"));
const env = Command.make("env").pipe(Command.withDescription("Start, stop, inspect or destroy an environment the app runs in"), Command.withSubcommands([environment("up"), environment("down"), environment("status"), destroyEnvironment]));

// `ortho worlds reap`: destroys every world of the test environment that is past its lifetime (D3 #7, #50).
const reap = Command.make(
  "reap",
  { root: rootFlag("whose test environment is reaped") },
  ({ root }) =>
    TestWorlds.reap({ root, name: "test" }).pipe(
      Effect.flatMap((n) => Console.log(`reaped ${n}`)),
      Effect.catchTag("TestWorldFailed", (e) => fail(e.message, 2)),
    ),
).pipe(Command.withDescription("Destroy every world of the test environment that is past its lifetime"));
const worlds = Command.make("worlds").pipe(Command.withDescription("Look after the test worlds proofs run in"), Command.withSubcommands([reap]));

// The CLI's own version is the one in its package.json, which sits next to `src/` and next to `dist/`, so one path serves source and the published package.
const ownVersion: string = (JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { readonly version: string }).version;

const onCommandLine = SecretsCommand.refusesValue(process.argv.slice(2));
if (onCommandLine !== undefined) { process.stderr.write(onCommandLine); process.exit(2); }

Command.make(Names.short).pipe(
  Command.withDescription("Orthograph: declare an app as a blueprint, then generate, prove, run and ship it"),
  Command.withSubcommands([model, dev, prove, promote, secrets, add, newCommand, check, generate, brief, impact, version, publish, build, env, worlds, telemetry, watch]),
  Command.run({ version: ownVersion }),
  Effect.provide(NodeServices.layer),
  NodeRuntime.runMain,
);
