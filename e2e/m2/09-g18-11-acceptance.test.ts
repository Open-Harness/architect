// Check 09 (Goal 18, slice 11): the acceptance check. Written by the author before the build; a builder never edits it (AGENTS.md,
// "Journeys and checks come first"). It starts from check 09 of #1111 (commit 754aa114), as GOAL18-getting-started-acceptance says.
//
// What it states, in the words of design/goals/18-framework.md slice 11: in CI, publish to a local registry, run `ortho new app`,
// declare one thing, then generate, prove, run it, and call it through the generated CLI, SDK and MCP. And, once slice 7's page
// exists, the getting-started page's steps (`docs/canon/getting-started.mdx`) are run as a reader runs them, in an empty folder.
//
// WHY IT IS RED TODAY: `ortho new app` is slice 6 (#1064, pull request #1087, a draft); the published `ortho` has no `new app`, so the run
// stops at its second step and every step after it says "(not run: an earlier step failed)". The page is slice 7's and does not exist yet.
//
// THE REGISTRY (e2e/local-registry.ts, the one shared helper: tools/e2e/starter.sh's steps, from its own tools/e2e/verdaccio.yaml).
// Verdaccio under Node, a process of this file, listening on 127.0.0.1 only. Orthograph's own names are served only from what this run
// published. VERDACCIO PROXIES EVERY OTHER DEPENDENCY TO npmjs (effect, wrangler and the rest are read through it, by Verdaccio, with no
// token). The publish runs under checks 44 and 45's network guard (`e2e/m1/deny-network.mjs`), so nothing it sends can leave the machine:
// the agents' network has a proxy that adds auth headers for npmjs, and nothing here may reach npmjs with a write. Every step's
// environment drops the caller's `npm_config_*`, `pnpm_config_*` and NODE_OPTIONS, points npm and pnpm at the local registry, and keeps
// its home, caches, store and global prefix under one temporary folder, removed after.
//
// THE RUN, each step with its own timeout (the whole fits inside the 20-minute e2e-m2 job; the PR gives the measured time):
//   1. build and publish every public package (`--tag next`) at the repository's version;
//   2. `npm install -g @orthograph/cli@<version>` from the registry, then `ortho new app bakery` in an empty folder;
//   3. `pnpm install` in bakery/;
//   4. declare one thing: `greeting`, with one operation `greeting.say` (payload `name`, answer `text`, anyone may call it), then
//      `pnpm ortho generate`, which writes its api, CLI, SDK and MCP entry and scaffolds its handler; then the handler and a journey
//      are written over the scaffold, as a reader would;
//   5. a copy of the app regenerated rewrites nothing in generated/;
//   6. `pnpm ortho prove --env local --json` passes every journey: the starter's, by name, and the new one;
//   7. `pnpm ortho dev --port <free>` answers;
//   8. calls: the generated CLI, the generated SDK (a script that imports generated/sdk) and MCP (`/mcp`, `tools/list` and
//      `tools/call`, signed in with a session the CLI got), each with its own name, each answered `Hello, <name>.`
// THE REFUSALS, each named: the CLI without `--name` exits non-zero and names `name`; the SDK given `{}` fails `InvalidPayload` naming
// `name`; MCP with no credential is 401 `unauthorized`, with a wrong one 401 `invalid_token`, and `tools/call` without `name` is an
// error result; the CLI and the SDK pointed at a closed port fail. The page's steps are refused by name before anything runs when one
// is not a plain command, and when one exports `npm_config_*`, `pnpm_config_*`, PATH or HOME.
// EXPECTED VALUES come from examples/starter (its blueprint, journeys and journey names), the repository's package versions, the
// generated CLI's rule for its variables (`name.toUpperCase().replace(/-/g, "_")`, packages/projections/src/modules/cli/internal/cli.ts)
// and the handler this check writes (`Hello, ${name}.`), never from what a step printed.
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { freePorts } from "../ports.ts";
import { GUARD, bare, publicPackages, publishAll, startRegistry, stopGroup, versionsOn, type Registry } from "../local-registry.ts";
import { repo } from "./support.ts";
import { NAME, PREFIX, STEPS, createAt, devAt, orthoRun, page, proveAt, refusal, refused, toolAt, urlSetAt } from "./getting-started-steps.ts";

const MIN = 60_000;
const work = mkdtempSync(join(realpathSync(tmpdir()), "ortho-g18-11-"));
const PORTS = freePorts("registry", "dev", "pageDev", "closed");
const home = join(work, "home");
const prefix = join(work, "prefix");
let registry: Registry | undefined;
let setup = "not started";
const running: ChildProcess[] = [];

/** A step's environment: nothing of the caller's npm or pnpm, the local registry, and a home, caches, store and prefix of this run's. */
const plain = (): NodeJS.ProcessEnv => ({
  ...bare(),
  HOME: home,
  PATH: `${join(prefix, "bin")}:${process.env["PATH"] ?? ""}`,
  FORCE_COLOR: "0", NO_COLOR: "1", CI: "1",
  npm_config_registry: registry?.url ?? "http://127.0.0.1:9/",
  pnpm_config_registry: registry?.url ?? "http://127.0.0.1:9/",
  npm_config_userconfig: join(home, ".npmrc"),
  npm_config_cache: join(work, "npm-cache"),
  npm_config_prefix: prefix,
  npm_config_update_notifier: "false",
  pnpm_config_store_dir: join(work, "pnpm-store"),
  pnpm_config_cache_dir: join(work, "pnpm-cache"),
});

const VERSION = (dir: string) => (JSON.parse(readFileSync(join(repo, "packages", dir, "package.json"), "utf8")) as { version: string }).version;

beforeAll(async () => {
  mkdirSync(home, { recursive: true });
  mkdirSync(prefix, { recursive: true });
  try { registry = await startRegistry(work, PORTS.registry); } catch (e) { setup = String(e); return; }
  running.push(registry.process);
  setup = publishAll(registry, { build: 10 * MIN, each: 2 * MIN });
}, 15 * MIN);

afterAll(async () => {
  for (const child of running.reverse()) await stopGroup(child);
  rmSync(work, { recursive: true, force: true });
}, 2 * MIN);

// ---- running a command, with its own timeout ----

interface Ran { readonly what: string; readonly status: number | null; readonly out: string; readonly err: string }
const run = (what: string, command: string, args: ReadonlyArray<string>, cwd: string, timeout: number, env: NodeJS.ProcessEnv = plain()): Ran => {
  const done = spawnSync(command, args, { cwd, env, encoding: "utf8", timeout, maxBuffer: 256 * 1024 * 1024 });
  const stopped = done.error ? `\n(stopped: ${String(done.error)}${done.signal ? `, ${done.signal} after ${timeout / 1000}s` : ""})` : "";
  return { what, status: done.status, out: done.stdout ?? "", err: `${done.stderr ?? ""}${stopped}` };
};
const shown = (r: Ran | undefined) => (r === undefined ? "(not run: an earlier step failed)" : `\`${r.what}\` exited ${r.status}:\n${`${r.out}\n${r.err}`.trim().slice(-3000)}`);
const answers = (url: string) => fetch(url, { signal: AbortSignal.timeout(3_000) }).then(() => true, () => false);
const until = async (ok: () => Promise<boolean>, seconds: number) => {
  for (let i = 0; i < seconds * 2; i++) { if (await ok()) return true; await new Promise((r) => setTimeout(r, 500)); }
  return false;
};
/** Start a server and wait for it to answer on its port; it is stopped, by its PID, in afterAll or by the last test. */
const serve = async (what: string, line: string, cwd: string, port: number, env: NodeJS.ProcessEnv, seconds: number): Promise<{ ran: Ran; child: ChildProcess }> => {
  const log: string[] = [];
  const child = spawn("bash", ["-c", line], { cwd, env, detached: true });
  running.push(child);
  child.stdout?.on("data", (d: Buffer) => log.push(d.toString()));
  child.stderr?.on("data", (d: Buffer) => log.push(d.toString()));
  const up = await until(async () => child.exitCode === null && (await answers(`http://127.0.0.1:${port}/`)), seconds);
  return { child, ran: { what, status: up ? 0 : 1, out: up ? "" : `nothing answered on 127.0.0.1:${port} within ${seconds}s`, err: log.join("").slice(-3000) } };
};

/** Every file under a folder, by its path inside it, with its text. */
const treeOf = (dir: string): ReadonlyMap<string, string> => {
  const out = new Map<string, string>();
  const go = (d: string) => {
    if (!existsSync(d)) return;
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const f = join(d, e.name);
      if (e.isDirectory()) go(f); else if (e.isFile()) out.set(relative(dir, f), readFileSync(f, "utf8"));
    }
  };
  go(dir);
  return out;
};
const diff = (want: ReadonlyMap<string, string>, got: ReadonlyMap<string, string>): ReadonlyArray<string> => [
  ...[...want.keys()].filter((k) => !got.has(k)).map((k) => `missing ${k}`),
  ...[...got.keys()].filter((k) => !want.has(k)).map((k) => `extra ${k}`),
  ...[...want.keys()].filter((k) => got.has(k) && got.get(k) !== want.get(k)).map((k) => `differs ${k}`),
];
/** The names of the starter's journeys, from `Blueprint.journey("<name>"` in each file of examples/starter/journeys. */
const starterJourneys = (): ReadonlyArray<string> =>
  readdirSync(join(repo, "examples/starter/journeys")).filter((f) => f.endsWith(".ts"))
    .flatMap((f) => [.../Blueprint\.journey\(\s*"([^"]+)"/.exec(readFileSync(join(repo, "examples/starter/journeys", f), "utf8"))?.slice(1, 2) ?? []]).sort();
/** An app's own `ortho`: @orthograph/cli installed in it from the registry. */
const installedCli = (app: string): { readonly dir: string; readonly version: string } | undefined => {
  const dir = join(app, "node_modules/@orthograph/cli");
  if (!existsSync(join(dir, "package.json"))) return undefined;
  return { dir: realpathSync(dir), version: (JSON.parse(readFileSync(join(dir, "package.json"), "utf8")) as { version: string }).version };
};
type Verdict = { passed?: boolean; totals?: { journeys?: number; journeysPassed?: number }; journeys?: ReadonlyArray<{ name: string; verdict: string; steps: ReadonlyArray<{ verdict: string; operation?: string; handlerFile?: string }> }> };
const json = <T>(text: string): T | undefined => { try { return JSON.parse(text.trim()) as T; } catch { return undefined; } };

// ---- the one thing this check declares, and what it answers ----

const APP = "bakery";
const ENV = APP.toUpperCase().replace(/-/g, "_");
const hello = (name: string) => `Hello, ${name}.`;
const JOURNEY = "a greeting says hello";
const DECLARED: Readonly<Record<string, string>> = {
  "blueprint/things/greeting/thing.ts": `import { Blueprint } from "orthograph";\n\nexport const Greeting = Blueprint.thing({\n  description: "A hello, said to someone by name.",\n  fields: { id: Blueprint.id("grt") },\n});\n`,
  "blueprint/things/greeting/verbs/say.ts": `import { Blueprint } from "orthograph";\nimport { Greeting } from "../thing.ts";\n\nexport default Blueprint.operation(Greeting, {\n  description: "Say hello to someone by name.",\n  payload: { name: Blueprint.text({ max: 64 }) },\n  answer: { text: Blueprint.text({ max: 128 }) },\n  allowed: [Blueprint.anyone],\n  budget: { p95: "50 millis" },\n});\n`,
};
const WRITTEN: Readonly<Record<string, string>> = {
  "src/greeting/say.ts": `// Scaffolded from blueprint/things/greeting/verbs/say.ts. Yours from now on.\nimport { Effect } from "effect";\nimport type { Handler } from "../../generated/api/src/greeting/say.handler.ts";\n\n/** Say hello to someone by name. */\nconst say: Handler = ({ name }) => Effect.succeed({ text: \`Hello, \${name}.\` });\n\nexport default say;\n`,
  "journeys/a-greeting-says-hello.ts": `import { Blueprint, expect, noEvents, spans } from "orthograph";\nimport say from "../blueprint/things/greeting/verbs/say.ts";\n\nexport default Blueprint.journey("${JOURNEY}", {\n  cast: { visitor: Blueprint.anyone },\n  steps: (s) => [\n    s.step(\n      "anyone is greeted by name",\n      s.visitor.run(say, { name: "Ada" }),\n      expect((a) => a.text).toBe("Hello, Ada."),\n      noEvents(),\n      spans({ present: ["greeting.say"] }),\n    ),\n  ],\n});\n`,
  // The SDK as a reader uses it: one call, its answer or its refusal's name and message printed as JSON.
  "sdk-call.ts": `import { Effect } from "effect";\nimport * as Sdk from "./generated/sdk/src/index.ts";\n\nconst [url = "", payload = "{}"] = process.argv.slice(2);\nconst program = Sdk.greeting.say(JSON.parse(payload)).pipe(\n  Effect.map((answer) => ({ answer })),\n  Effect.catch((e: { readonly _tag?: string; readonly message?: string }) => Effect.succeed({ refused: e._tag ?? "unknown", message: e.message ?? "" })),\n  Effect.provide(Sdk.layer(url)),\n);\nEffect.runPromiseExit(program).then((exit) => {\n  process.stdout.write(JSON.stringify(exit._tag === "Success" ? exit.value : { died: true }) + "\\n");\n  if (exit._tag !== "Success" || !("answer" in exit.value)) process.exitCode = 1;\n});\n`,
};

// ---- the run's state, step by step ----

const apps = join(work, "apps");
const made = join(apps, APP);
const steps: Record<string, Ran | undefined> = {};
let dev: ChildProcess | undefined;
const url = `http://127.0.0.1:${PORTS.dev}`;
const closed = `http://127.0.0.1:${PORTS.closed}`;
const cli = (args: ReadonlyArray<string>, at: string, timeout = 2 * MIN, token?: string) =>
  run(`${APP} ${args.join(" ")}`, "node", ["generated/cli/src/main.ts", ...args], made, timeout, { ...plain(), [`${ENV}_URL`]: at, ...(token ? { [`${ENV}_TOKEN`]: token } : {}) });
const sdk = (at: string, payload: object) => run(`node sdk-call.ts ${at} ${JSON.stringify(payload)}`, "node", ["sdk-call.ts", at, JSON.stringify(payload)], made, 2 * MIN);
interface Rpc { readonly status: number; readonly body: unknown }
const rpc = async (method: string, params: object, authorization?: string): Promise<Rpc> => {
  const r = await fetch(`${url}/mcp`, {
    method: "POST", signal: AbortSignal.timeout(60_000),
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream", ...(authorization ? { authorization } : {}) },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  }).catch((e: unknown) => ({ status: 0, text: () => Promise.resolve(String(e)) }));
  const text = await r.text();
  return { status: r.status, body: json(text.replace(/^data: /m, "")) ?? text };
};

describe("09 controls: the registry is local and the guard holds", () => {
  it("the registry listens on 127.0.0.1 only, and serves Orthograph's own names with no proxy to npmjs", () => {
    expect(registry, `the registry was started: ${setup}`).toBeDefined();
    const config = registry?.config ?? "";
    expect(config).toMatch(/^listen: 127\.0\.0\.1:\d+$/m);
    for (const name of ["orthograph", "@orthograph/*", ...publicPackages().map((p) => p.name).filter((n) => !n.startsWith("@orthograph/"))]) {
      const block = new RegExp(`^  '${name.replace(/[*/]/g, "\\$&")}':\\n((?:    .*\\n)+)`, "m").exec(config)?.[1];
      expect(block, `a packages entry for ${name}`).toBeDefined();
      expect(block, `${name} is never read from npmjs`).not.toMatch(/proxy:/);
    }
  });
  it("the publish's guard ends a connection to npmjs, and lets the local registry be", () => {
    const probe = (where: string) => spawnSync(process.execPath, ["--import", GUARD, "-e", `fetch(${JSON.stringify(where)}).then(()=>process.exit(0),()=>process.exit(3))`], { encoding: "utf8", timeout: 30_000 });
    const out = probe("https://registry.npmjs.org/orthograph");
    expect(out.stderr).toContain("NETWORK-DENIED registry.npmjs.org");
    expect(out.status).toBe(97);
    expect(probe(`${registry?.url ?? "http://127.0.0.1:9/"}-/ping`).stderr).not.toContain("NETWORK-DENIED");
  });
});

describe("09 the acceptance run: publish, ortho new app, declare one thing, generate, prove, run, call (Goal 18, slice 11)", () => {
  it("publishes every public package to the local registry at the repository's version", { timeout: 5 * MIN }, async () => {
    expect(setup, "building and publishing Orthograph to the local registry").toBe("");
    if (registry === undefined) return;
    for (const p of publicPackages()) { const held = await versionsOn(registry, p.name); expect(held, `${p.name} on the local registry`).toContain(p.version); }
  });

  it("`ortho new app bakery`, from @orthograph/cli as published, makes the starter under that name in an empty folder", { timeout: 8 * MIN }, () => {
    expect(setup, "publishing").toBe("");
    mkdirSync(apps, { recursive: true });
    steps["global"] = run(`npm install -g @orthograph/cli@${VERSION("cli")}`, "npm", ["install", "-g", `@orthograph/cli@${VERSION("cli")}`], apps, 5 * MIN);
    expect(steps["global"].status, shown(steps["global"])).toBe(0);
    steps["new"] = run(`ortho new app ${APP}`, "ortho", ["new", "app", APP], apps, 2 * MIN);
    expect(steps["new"].status, shown(steps["new"])).toBe(0);
    expect(diff(treeOf(join(repo, "examples/starter/blueprint")), treeOf(join(made, "blueprint"))), "bakery/blueprint/ against examples/starter/blueprint/").toEqual([]);
    expect(diff(treeOf(join(repo, "examples/starter/journeys")), treeOf(join(made, "journeys"))), "bakery/journeys/ against examples/starter/journeys/").toEqual([]);
  });

  it("`pnpm install` in bakery/ installs Orthograph from the registry: its own ortho is @orthograph/cli at the repository's version, in pnpm's store", { timeout: 8 * MIN }, () => {
    expect(steps["new"]?.status, shown(steps["new"])).toBe(0);
    steps["install"] = run("pnpm install", "pnpm", ["install"], made, 7 * MIN);
    expect(steps["install"].status, shown(steps["install"])).toBe(0);
    const own = installedCli(made);
    expect(own?.version, "bakery/node_modules/@orthograph/cli").toBe(VERSION("cli"));
    expect(own?.dir ?? "", "installed into pnpm's store, not linked from the repository").toMatch(/node_modules\/\.pnpm\/@orthograph\+cli@/);
  });

  it("declaring `greeting` with `greeting.say` and running `ortho generate` writes its api, CLI, SDK and MCP entry, and scaffolds its handler", { timeout: 6 * MIN }, () => {
    expect(steps["install"]?.status, shown(steps["install"])).toBe(0);
    for (const [path, text] of Object.entries(DECLARED)) { mkdirSync(join(made, path, ".."), { recursive: true }); writeFileSync(join(made, path), text); }
    steps["generate"] = run("pnpm ortho generate", "pnpm", ["ortho", "generate"], made, 5 * MIN);
    expect(steps["generate"].status, shown(steps["generate"])).toBe(0);
    for (const f of ["generated/api/src/greeting/say.ts", "generated/cli/src/greeting/say.ts", "generated/sdk/src/greeting/say.ts"]) expect(existsSync(join(made, f)), f).toBe(true);
    expect(readFileSync(join(made, "generated/mcp/src/index.ts"), "utf8"), "the MCP catalog").toMatch(/"greeting\.say": \{ description: "Say hello to someone by name\."/);
    const scaffold = existsSync(join(made, "src/greeting/say.ts")) ? readFileSync(join(made, "src/greeting/say.ts"), "utf8") : "";
    expect(scaffold.split("\n")[0], "src/greeting/say.ts, scaffolded").toBe("// Scaffolded from blueprint/things/greeting/verbs/say.ts. Yours from now on.");
    for (const [path, text] of Object.entries(WRITTEN)) { mkdirSync(join(made, path, ".."), { recursive: true }); writeFileSync(join(made, path), text); }
    steps["written"] = { what: "the handler, the journey and the SDK script written", status: 0, out: "", err: "" };
  });

  it("bakery's generated/ is what its own `ortho generate` makes: a copy regenerated rewrites nothing", { timeout: 6 * MIN }, () => {
    expect(steps["written"]?.status, shown(steps["generate"])).toBe(0);
    const copy = join(mkdtempSync(join(work, "regen-")), APP);
    mkdirSync(copy);
    for (const e of readdirSync(made)) if (e !== "node_modules") cpSync(join(made, e), join(copy, e), { recursive: true });
    symlinkSync(join(made, "node_modules"), join(copy, "node_modules"));
    const again = run("pnpm ortho generate (a copy)", "pnpm", ["ortho", "generate"], copy, 5 * MIN);
    expect(again.status, shown(again)).toBe(0);
    expect(diff(treeOf(join(made, "generated")), treeOf(join(copy, "generated"))), "bakery/generated/ against a fresh `ortho generate`").toEqual([]);
  });

  it("`ortho prove --env local --json` passes every journey: the starter's, by name, and the new one, which runs greeting.say through its handler", { timeout: 15 * MIN }, () => {
    expect(steps["written"]?.status, shown(steps["generate"])).toBe(0);
    steps["prove"] = run("pnpm ortho prove --env local --json", "pnpm", ["ortho", "prove", "--env", "local", "--json"], made, 14 * MIN);
    const verdict = json<Verdict>(steps["prove"].out.slice(steps["prove"].out.indexOf("{")));
    expect(verdict, `no verdict: ${shown(steps["prove"])}`).toBeDefined();
    expect(verdict?.passed, shown(steps["prove"])).toBe(true);
    expect(steps["prove"].status, shown(steps["prove"])).toBe(0);
    expect((verdict?.journeys ?? []).map((j) => j.name).sort(), "the journeys proved").toEqual([...starterJourneys(), JOURNEY].sort());
    expect((verdict?.journeys ?? []).filter((j) => j.verdict !== "pass").map((j) => j.name), "journeys that did not pass").toEqual([]);
    expect(verdict?.totals?.journeysPassed).toBe(starterJourneys().length + 1);
    const mine = verdict?.journeys?.find((j) => j.name === JOURNEY);
    expect(mine?.steps.map((s) => [s.verdict, s.operation, s.handlerFile]), "the new journey's step").toEqual([["pass", "greeting.say", "src/greeting/say.ts"]]);
  });

  it("`ortho dev` runs the app: it answers on the port it is given", { timeout: 6 * MIN }, async () => {
    expect(steps["prove"]?.status, shown(steps["prove"])).toBe(0);
    const started = await serve(`pnpm ortho dev --port ${PORTS.dev}`, `pnpm ortho dev --port ${PORTS.dev}`, made, PORTS.dev, plain(), 300);
    dev = started.child;
    steps["dev"] = started.ran;
    expect(steps["dev"].status, shown(steps["dev"])).toBe(0);
  });

  it("the generated CLI calls greeting.say on the running app, for each name it is given; without --name, or at a closed port, it is refused", { timeout: 8 * MIN }, () => {
    expect(steps["dev"]?.status, shown(steps["dev"])).toBe(0);
    for (const name of ["Ada", "Grace"]) {
      const r = cli(["greeting", "say", "--name", name, "--json"], url);
      expect(r.status, shown(r)).toBe(0);
      expect(json<{ text?: unknown }>(r.out), shown(r)).toEqual({ text: hello(name) });
    }
    const missing = cli(["greeting", "say", "--json"], url);
    expect(missing.status, shown(missing)).not.toBe(0);
    expect(`${missing.out}${missing.err}`, "the refusal names the missing flag").toMatch(/\bname\b/);
    const away = cli(["greeting", "say", "--name", "Ada", "--json"], closed);
    expect(away.status, shown(away)).not.toBe(0);
    expect(away.out, "nothing answered at a closed port").not.toContain(hello("Ada"));
  });

  it("the generated SDK, imported by a script, calls greeting.say; given `{}` it fails InvalidPayload naming `name`, and at a closed port it fails", { timeout: 6 * MIN }, () => {
    expect(steps["dev"]?.status, shown(steps["dev"])).toBe(0);
    for (const name of ["Lin", "Mae"]) {
      const r = sdk(url, { name });
      expect(r.status, shown(r)).toBe(0);
      expect(json(r.out), shown(r)).toEqual({ answer: { text: hello(name) } });
    }
    const empty = sdk(url, {});
    const refusedEmpty = json<{ refused?: string; message?: string }>(empty.out);
    expect(refusedEmpty?.refused, shown(empty)).toBe("InvalidPayload");
    expect(refusedEmpty?.message ?? "", shown(empty)).toMatch(/\bname\b/);
    expect(empty.status, shown(empty)).not.toBe(0);
    const away = sdk(closed, { name: "Lin" });
    expect(away.status, shown(away)).not.toBe(0);
    expect(json<{ answer?: unknown }>(away.out)?.answer, shown(away)).toBeUndefined();
  });

  it("MCP at /mcp, signed in with a session the CLI got, lists greeting.say and calls it; no credential, a wrong one and a call without `name` are refused", { timeout: 6 * MIN }, async () => {
    expect(steps["dev"]?.status, shown(steps["dev"])).toBe(0);
    const email = `ada.${PORTS.dev}@example.com`;
    const password = `pw-${PORTS.closed}-${PORTS.dev}-acceptance`;
    const up = cli(["person", "sign-up", "--email", email, "--password", password, "--name", "Ada", "--json"], url);
    expect(up.status, shown(up)).toBe(0);
    const signedIn = cli(["session", "sign-in", "--email", email, "--password", password, "--json"], url);
    expect(signedIn.status, shown({ ...signedIn, out: "(the token is not shown)" })).toBe(0);
    const token = json<{ token?: string }>(signedIn.out)?.token ?? "";
    expect(token, "session sign-in gave a token").not.toBe("");
    const bearer = `Bearer ${token}`;
    const listed = await rpc("tools/list", {}, bearer);
    const tools = (listed.body as { result?: { tools?: ReadonlyArray<{ name: string; description?: string }> } }).result?.tools ?? [];
    expect(tools.find((t) => t.name === "greeting.say")?.description, `tools/list: ${JSON.stringify(listed).slice(0, 600)}`).toBe("Say hello to someone by name.");
    for (const name of ["Ola", "Kit"]) {
      const called = await rpc("tools/call", { name: "greeting.say", arguments: { name } }, bearer);
      const result = (called.body as { result?: { isError?: boolean; structuredContent?: unknown; content?: ReadonlyArray<{ text?: string }> } }).result;
      expect(result?.isError ?? false, JSON.stringify(called).slice(0, 600)).toBe(false);
      const said = (result?.structuredContent as { text?: unknown } | undefined)?.text ?? json<{ text?: unknown }>(result?.content?.[0]?.text ?? "")?.text;
      expect(said, JSON.stringify(called).slice(0, 600)).toBe(hello(name));
    }
    const nobody = await rpc("tools/list", {});
    expect([nobody.status, (nobody.body as { error?: unknown }).error], "no credential").toEqual([401, "unauthorized"]);
    const wrong = await rpc("tools/list", {}, `Bearer ${token.split("").reverse().join("")}x`);
    expect([wrong.status, (wrong.body as { error?: unknown }).error], "a wrong credential").toEqual([401, "invalid_token"]);
    const bad = await rpc("tools/call", { name: "greeting.say", arguments: {} }, bearer);
    const badResult = (bad.body as { result?: { isError?: boolean; content?: ReadonlyArray<{ text?: string }> }; error?: unknown });
    expect(badResult.result?.isError === true || badResult.error !== undefined, `a call without name: ${JSON.stringify(bad).slice(0, 600)}`).toBe(true);
    expect(JSON.stringify(bad), "no hello for a call without a name").not.toContain("Hello,");
  });

  it("stopping `ortho dev` leaves nothing of bakery running", { timeout: 2 * MIN }, async () => {
    expect(steps["dev"]?.status, shown(steps["dev"])).toBe(0);
    await stopGroup(dev);
    expect(spawnSync("pgrep", ["-fl", made], { encoding: "utf8" }).stdout.trim()).toBe("");
  });
});

// ---- the getting-started page, run as written (check 09 of #1111, with the page as one of slice 11's inputs) ----

const pageRoot = join(work, "page");
const pageRan: Ran[] = [];
let pageCwd = pageRoot;
const exported: Record<string, string> = {};
let pageDev: ChildProcess | undefined;
/** The page's own port for the app, read as the free one this run gave its `ortho dev`. */
const local = (s: string) => s.replace(/:8787\b/g, `:${PORTS.pageDev}`);
const runPageStep = async (raw: string): Promise<Ran> => {
  const step = local(raw);
  const cd = /^cd\s+(\S+)$/.exec(step);
  if (cd) { pageCwd = resolve(pageCwd, cd[1] ?? "."); return { what: raw, status: existsSync(pageCwd) ? 0 : 1, out: existsSync(pageCwd) ? "" : `no folder ${pageCwd}`, err: "" }; }
  const exp = /^export\s+([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(step);
  if (exp) { exported[exp[1] ?? ""] = (exp[2] ?? "").replace(/^["']|["']$/g, ""); return { what: raw, status: 0, out: "", err: "" }; }
  const env = { ...plain(), ...exported };
  if (orthoRun("dev").test(step)) {
    const started = await serve(raw, /--port\b/.test(step) ? step : `${step} --port ${PORTS.pageDev}`, pageCwd, PORTS.pageDev, env, 300);
    pageDev = started.child;
    return started.ran;
  }
  return { ...run(raw, "bash", ["-c", step], pageCwd, 10 * MIN, env), what: raw };
};
const pageMade = () => join(pageRoot, NAME ?? "\u0000");

describe("09 the getting-started page, run as written: its steps are one input of the acceptance check (Goal 18, slices 7 and 11)", () => {
  it("the page exists and shows its steps in sh fences: a create, `ortho prove`, `ortho dev` and a call through the generated CLI, in that order", () => {
    expect(page, "docs/canon/getting-started.mdx does not exist").not.toBe("");
    expect(createAt, `no step creates an app; the steps are:\n${STEPS.join("\n")}`).toBeGreaterThanOrEqual(0);
    expect(proveAt, "no `ortho prove` step").toBeGreaterThan(createAt);
    expect(devAt, "no `ortho dev` step after `ortho prove`").toBeGreaterThan(proveAt);
    expect(toolAt, `no step after \`ortho dev\` runs the app's generated CLI`).toBeGreaterThan(devAt);
  });

  it("every step is a plain command a reader types, and none exports npm_config_*, pnpm_config_*, PATH or HOME", () => {
    expect(page, "docs/canon/getting-started.mdx does not exist").not.toBe("");
    expect(refused).toEqual([]);
  });

  it("the refusals are named: a shell step, a foreign program, and an export of npm_config_*, pnpm_config_*, PATH or HOME", () => {
    expect(refusal("ortho prove | tee out")).toMatch(/uses the shell/);
    expect(refusal("curl https://example.com")).toMatch(/`curl` is not a program the page may run/);
    expect(refusal("npm install left-pad")).toMatch(/installs something other than Orthograph/);
    for (const moved of ["npm_config_registry=http://127.0.0.1:4873/", "pnpm_config_store_dir=/tmp/s", "NPM_CONFIG_PREFIX=/tmp/p", "PATH=/usr/bin", "HOME=/tmp/h"]) {
      expect(refusal(`export ${moved}`), moved).toMatch(new RegExp(`exports ${moved.split("=")[0]}\\b`));
    }
    expect(refusal("export BAKERY_URL=http://127.0.0.1:8787")).toBeUndefined();
    expect(refusal("cd bakery")).toBeUndefined();
  });

  it("every step runs in an empty folder against Orthograph from the local registry, and exits 0", { timeout: 30 * MIN }, async () => {
    expect(page, "docs/canon/getting-started.mdx does not exist").not.toBe("");
    expect(refused, "a step that is not a plain command is not run").toEqual([]);
    expect(setup, "publishing Orthograph to the local registry").toBe("");
    mkdirSync(pageRoot, { recursive: true });
    for (const step of STEPS) {
      const r = await runPageStep(step);
      pageRan.push(r);
      expect(r.status, `step ${pageRan.length} of ${STEPS.length}: ${shown(r)}`).toBe(0);
    }
  });

  it("the page's create step makes the starter under its name, with @orthograph/cli as published for its ortho", () => {
    expect(pageRan[createAt]?.status, shown(pageRan[createAt])).toBe(0);
    expect(diff(treeOf(join(repo, "examples/starter/blueprint")), treeOf(join(pageMade(), "blueprint"))), `${NAME}/blueprint/`).toEqual([]);
    expect(diff(treeOf(join(repo, "examples/starter/journeys")), treeOf(join(pageMade(), "journeys"))), `${NAME}/journeys/`).toEqual([]);
    expect(installedCli(pageMade())?.version, `${NAME}/node_modules/@orthograph/cli`).toBe(VERSION("cli"));
  });

  it("the page proves the whole app (no --empty, --only or --changed), and its prove passed", () => {
    expect(STEPS[proveAt] ?? "", "the prove step").not.toMatch(/--(?:empty|only|changed)\b/);
    expect(pageRan[proveAt]?.status, shown(pageRan[proveAt])).toBe(0);
  });

  it("the page calls the generated CLI with `<APP>_URL` set for its app, names `<APP>_TOKEN`, and the call fails at a closed port", { timeout: 5 * MIN }, () => {
    expect(PREFIX, "an app name on the create step").toBeDefined();
    const sets = (urlSetAt >= 0 && urlSetAt <= toolAt) || new RegExp(`\\b${PREFIX}_URL=`).test(STEPS[toolAt] ?? "");
    expect(sets, `a step at or before the call sets \`${PREFIX}_URL\``).toBe(true);
    expect([...page.matchAll(/\b([A-Z][A-Z0-9_]*)_(?:URL|TOKEN)\b/g)].map((m) => m[1]).filter((p) => p !== PREFIX && p !== "APP"), "a variable for another app").toEqual([]);
    expect(page, "the page names `<APP>_TOKEN`").toContain("_TOKEN");
    expect(pageRan[toolAt]?.status, shown(pageRan[toolAt])).toBe(0);
    const line = local(STEPS[toolAt] ?? "").replace(new RegExp(`\\b${PREFIX}_URL=\\S+`), `${PREFIX}_URL=${closed}`);
    const away = run(line, "bash", ["-c", line], pageCwd, 4 * MIN, { ...plain(), ...exported, [`${PREFIX}_URL`]: closed });
    expect(away.status, shown(away)).not.toBe(0);
  });

  it("stopping the page's `ortho dev` leaves nothing of its app running", { timeout: 2 * MIN }, async () => {
    expect(pageRan[devAt]?.status, shown(pageRan[devAt])).toBe(0);
    await stopGroup(pageDev);
    expect(spawnSync("pgrep", ["-fl", pageRoot], { encoding: "utf8" }).stdout.trim()).toBe("");
  });
});
