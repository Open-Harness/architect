// Check 09 (Goal 18, slice 7, #1065): the getting-started page, `docs/canon/getting-started.mdx`, run as a reader runs it.
// Written by the author before the build; a builder never edits it (AGENTS.md, "Journeys and checks come first").
//
// What it states, in the words of design/goals/18-framework.md slice 7: one page from install to a proved, running app and its
// generated tools (`<APP>_URL`, `<APP>_TOKEN`). So the page is not judged by its words: its steps are run, in order, in an empty
// folder, against Orthograph published to a local registry (as tools/e2e/starter.sh does), and each must do what it says.
//
// The page's contract with this check (what a builder writes):
//  - A step is a line in a fence whose info string is `sh`, `bash` or `shell` (or a `$ ` line in a `console` fence). A line that
//    ends in `\` goes on to the next. Lines starting `#` are comments. Fences of any other kind (```text, ```ts) are not run.
//    `a && b` is two steps, one after the other.
//  - A step is a plain command a reader types, not a script: `cd <dir>`, `export NAME=value`, or `[NAME=value …] <program> …`
//    where the program is npm, npx, pnpm, yarn, bun, `ortho`, the app's own command, or `node` running the app's generated CLI.
//    npx, `npm exec`, `pnpm exec` and `pnpm dlx` run `ortho`, `create-orthograph` or the app's command; an install installs only
//    `orthograph`, `@orthograph/*` or `create-orthograph`. No `;`, `|`, `||`, `&`, redirects, `$(…)`, backticks or parentheses.
//    A step outside this is refused by name, before anything runs.
//  - Steps run one after another, each in `bash -c`, starting in an empty folder. `cd <dir>` moves the folder for the steps
//    after it; `export NAME=value` sets the variable for the steps after it.
//  - The step that runs `ortho dev` is started and left running (it serves until stopped); the check waits for the app to answer,
//    then goes on. It is given `--port <free port>` when it names none, and every later `:8787` in the page's steps is read as
//    that port, so that two runs on one machine never meet.
//  - Every other step must exit 0.
// The page's steps are not trusted to have done what they say. After them the check looks for itself: the app's blueprint is
// examples/starter's, its `ortho` is @orthograph/cli as published, `ortho generate` in a copy rewrites nothing in its generated/,
// `ortho prove --env local --json` (run by the check, with that `ortho`) passes every journey the starter has, and the check's own
// call through the app's generated CLI (`system health`) answers from the running app and fails against a closed port.
// The registry is Verdaccio under Node, a process of this file; its storage, the caches, the home folder and the app are under one
// temporary folder, removed after. `npm_config_registry` points at it, so `npm`, `npx` and `pnpm` read Orthograph from it and the
// rest of npm through it. A global install lands in the temporary folder (`npm_config_prefix`), whose `bin` is on PATH.
// What is published is every public package under packages/ (the set tools/release/preview.mjs lists), by `pnpm publish`,
// after `nx run-many -t build`: what slice 5 makes the release.
// The expected values come from the page's own create step (the app's name), from the generated CLI's rule for its variables
// (`name.toUpperCase().replace(/-/g, "_")`, packages/projections/src/modules/cli/internal/cli.ts) and from the app itself,
// never from what a step printed.
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { freePorts } from "../ports.ts";
import { repo } from "./support.ts";

const PAGE = join(repo, "docs/canon/getting-started.mdx");
const page = existsSync(PAGE) ? readFileSync(PAGE, "utf8") : "";

// ---- the page's steps ----

/** The steps of the page, in order: every command line of its sh, bash and shell fences, and the `$ ` lines of its console fences; `a && b` is two. */
const stepsOf = (text: string): ReadonlyArray<string> => {
  const out: string[] = [];
  let kind: "run" | "console" | "skip" | undefined;
  let pending = "";
  for (const raw of text.split("\n")) {
    const fence = /^\s*```\s*([\w-]*)/.exec(raw);
    if (fence) {
      kind = kind !== undefined ? undefined : ["sh", "bash", "shell"].includes(fence[1] ?? "") ? "run" : fence[1] === "console" ? "console" : "skip";
      pending = "";
      continue;
    }
    if (kind === undefined || kind === "skip") continue;
    let line = raw.trim();
    if (pending === "") {
      if (kind === "console") { if (!line.startsWith("$ ")) continue; line = line.slice(2).trim(); }
      else line = line.replace(/^\$\s+/, "");
      if (line === "" || line.startsWith("#")) continue;
    }
    if (line.endsWith("\\")) { pending += `${line.slice(0, -1).trim()} `; continue; }
    out.push(...`${pending}${line}`.split("&&").map((x) => x.trim()).filter((x) => x !== ""));
    pending = "";
  }
  return out;
};
const STEPS = stepsOf(page);

const RUNNER = /^(?:(?:pnpm|yarn|bun)\s+(?:exec|dlx)\s+|npx\s+(?:--yes\s+|-y\s+)?|npm\s+exec\s+(?:--yes\s+)?(?:--\s+)?)/;
/** `ortho <verb>`, as a reader types it: plain, or through pnpm, npx, npm exec, yarn or bun. */
const orthoRun = (verb: string) => new RegExp(`^(?:[A-Z][A-Z0-9_]*=\\S+\\s+)*(?:(?:pnpm|yarn|bun)(?:\\s+exec)?\\s+|npx\\s+(?:--yes\\s+|-y\\s+)?|npm\\s+exec\\s+(?:--yes\\s+)?(?:--\\s+)?)?ortho\\s+${verb}\\b`);
const CREATE = /^(?:(?:(?:pnpm|yarn|bun)(?:\s+exec)?\s+|npx\s+(?:--yes\s+|-y\s+)?)?ortho\s+new\s+app|(?:npm|pnpm|yarn|bun)\s+(?:create|init)\s+orthograph(?:@\S+)?|npx\s+(?:--yes\s+|-y\s+)?create-orthograph(?:@\S+)?)\s+([a-z][a-z0-9-]*)\b/;
const at = (re: RegExp) => STEPS.findIndex((s) => re.test(s));
const createAt = at(CREATE);
const NAME = createAt >= 0 ? CREATE.exec(STEPS[createAt] ?? "")?.[1] : undefined;
/** The generated CLI's rule for an app's variables (cli.ts: `name.toUpperCase().replace(/-/g, "_")`). */
const PREFIX = NAME?.toUpperCase().replace(/-/g, "_");
const proveAt = at(orthoRun("prove"));
const devAt = at(orthoRun("dev"));

/** Why a step is not a plain command a reader types (the contract above), or undefined when it is. */
const refusal = (step: string): string | undefined => {
  if (/[;|&<>()`]|\$\(/.test(step)) return "it uses the shell (`;`, `|`, `&`, a redirect, `$(…)`, backticks or parentheses)";
  if (/^cd\s+\S+$/.test(step) || /^export\s+[A-Za-z_][A-Za-z0-9_]*=\S*$/.test(step)) return undefined;
  const words = step.replace(/^(?:[A-Za-z_][A-Za-z0-9_]*=\S*\s+)+/, "").split(/\s+/);
  if (words.some((w) => /^[A-Za-z_][A-Za-z0-9_]*=/.test(w) && words.indexOf(w) === 0)) return "it only sets a variable";
  const [program = "", ...rest] = words;
  const pkg = /^(?:orthograph|@orthograph\/[a-z0-9-]+|create-orthograph)(?:@[\w.-]+)?$/;
  const runnable = (w: string | undefined) => w === "ortho" || w === NAME || /^create-orthograph(?:@[\w.-]+)?$/.test(w ?? "");
  const plainArgs = rest.filter((w) => !w.startsWith("-"));
  if (RUNNER.test(step.replace(/^(?:[A-Za-z_][A-Za-z0-9_]*=\S*\s+)+/, ""))) {
    const after = step.replace(/^(?:[A-Za-z_][A-Za-z0-9_]*=\S*\s+)+/, "").replace(RUNNER, "").split(/\s+/)[0];
    return runnable(after) ? undefined : `it runs \`${after}\`, not ortho, create-orthograph or the app's command`;
  }
  if (program === "ortho" || program === NAME) return undefined;
  if (program === "node") return /^(?:\.\/)?generated\/cli\/src\/main\.ts$/.test(rest[0] ?? "") ? undefined : "node runs something other than the app's generated CLI";
  if (["npm", "pnpm", "yarn", "bun"].includes(program)) {
    const [verb = "", ...args] = plainArgs;
    if (["create", "init"].includes(verb)) return /^orthograph(?:@[\w.-]+)?$/.test(args[0] ?? "") ? undefined : `it creates from \`${args[0]}\`, not orthograph`;
    if (["install", "i", "add"].includes(verb)) return args.every((a) => pkg.test(a)) ? undefined : `it installs something other than Orthograph: ${args.join(" ")}`;
    if (verb === "ortho" || verb === NAME) return undefined;
    return `\`${program} ${verb}\` is not an install, a create or a run of ortho or the app`;
  }
  return `\`${program}\` is not a program the page may run`;
};
const refused = STEPS.flatMap((s) => { const why = refusal(s); return why === undefined ? [] : [`\`${s}\`: ${why}`]; });
/** The step that calls the app through its generated CLI: the app's own command (`<name> …`, the bin it declares) or `node generated/cli/src/main.ts …`. */
const callsTool = (s: string) => {
  const bare = s.replace(/^(?:[A-Za-z_][A-Za-z0-9_]*=\S*\s+)+/, "");
  return NAME !== undefined && (new RegExp(`^(?:(?:pnpm|yarn|bun)(?:\\s+exec)?\\s+|npx\\s+(?:--yes\\s+|-y\\s+)?)?${NAME}\\s+\\S`).test(bare) || /^node\s+(?:\.\/)?generated\/cli\/src\/main\.ts\s+\S/.test(bare));
};
const toolAt = STEPS.findIndex((s, i) => i > devAt && devAt >= 0 && callsTool(s));
const urlSetAt = PREFIX === undefined ? -1 : STEPS.findIndex((s) => new RegExp(`\\b${PREFIX}_URL=`).test(s));

// ---- the world the steps run in ----

const roots: string[] = [];
const work = mkdtempSync(join(realpathSync(tmpdir()), "ortho-g18-7-"));
roots.push(work);
const PORTS = freePorts("registry", "dev", "closed");
const registry = `http://127.0.0.1:${PORTS.registry}/`;
let registryProcess: ChildProcess | undefined;
let devProcess: ChildProcess | undefined;
const devLog: string[] = [];

const home = join(work, "home");
const prefix = join(work, "prefix");
const app = join(work, "start");
const plain = (): NodeJS.ProcessEnv => {
  const env: NodeJS.ProcessEnv = { ...process.env };
  for (const k of Object.keys(env)) if (/^(npm|pnpm)_/i.test(k) || k === "NODE_OPTIONS" || k === "INIT_CWD") delete env[k];
  return {
    ...env,
    HOME: home,
    PATH: `${join(prefix, "bin")}:${process.env["PATH"] ?? ""}`,
    FORCE_COLOR: "0",
    NO_COLOR: "1",
    CI: "1",
    npm_config_registry: registry,
    pnpm_config_registry: registry,
    npm_config_userconfig: join(home, ".npmrc"),
    npm_config_cache: join(work, "npm-cache"),
    npm_config_prefix: prefix,
    npm_config_update_notifier: "false",
    pnpm_config_store_dir: join(work, "pnpm-store"),
    pnpm_config_cache_dir: join(work, "pnpm-cache"),
  };
};

/** Every public package under packages/: no `"private": true` (tools/release/preview.mjs lists the same). */
const publicPackages = (): ReadonlyArray<string> =>
  readdirSync(join(repo, "packages"), { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(repo, "packages", d.name, "package.json")))
    .map((d) => d.name)
    .filter((d) => (JSON.parse(readFileSync(join(repo, "packages", d, "package.json"), "utf8")) as { private?: boolean }).private !== true)
    .sort();

const answers = (url: string): Promise<boolean> =>
  fetch(url, { signal: AbortSignal.timeout(3_000) }).then((r) => r.status > 0, () => false);
const until = async (ok: () => Promise<boolean>, seconds: number): Promise<boolean> => {
  for (let i = 0; i < seconds * 2; i++) {
    if (await ok()) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
};
const stop = async (child: ChildProcess | undefined) => {
  if (child?.pid === undefined || child.exitCode !== null) return;
  try { process.kill(-child.pid, "SIGTERM"); } catch { /* already gone */ }
  if (!(await until(async () => child.exitCode !== null || child.signalCode !== null, 10))) {
    try { process.kill(-child.pid, "SIGKILL"); } catch { /* already gone */ }
  }
};

let setup = "";
beforeAll(async () => {
  if (page === "") return;
  mkdirSync(home, { recursive: true });
  mkdirSync(prefix, { recursive: true });
  mkdirSync(app, { recursive: true });
  const built = spawnSync("pnpm", ["nx", "run-many", "-t", "build", "--outputStyle=static"], { cwd: repo, encoding: "utf8", env: { ...process.env, NX_DAEMON: "false" }, maxBuffer: 256 * 1024 * 1024 });
  if (built.status !== 0) { setup = `nx run-many -t build failed: ${`${built.stdout}${built.stderr}`.slice(-2000)}`; return; }
  const storage = join(work, "storage");
  mkdirSync(storage, { recursive: true });
  // tools/e2e/verdaccio.yaml, with every public package's own name allowed to publish (it allows `orthograph` and `@orthograph/*`;
  // a public package named otherwise, such as `create-orthograph`, would be refused by the registry, not by the release).
  const names = publicPackages().map((p) => (JSON.parse(readFileSync(join(repo, "packages", p, "package.json"), "utf8")) as { name: string }).name);
  const own = names.filter((n) => n !== "orthograph" && !n.startsWith("@orthograph/")).map((n) => `  '${n}':\n    access: $all\n    publish: $all\n    unpublish: $all\n`).join("");
  const config = readFileSync(join(repo, "tools/e2e/verdaccio.yaml"), "utf8").replaceAll("__STORAGE__", storage).replaceAll("__PORT__", String(PORTS.registry)).replace(/^packages:\n/m, `packages:\n${own}`);
  writeFileSync(join(work, "verdaccio.yaml"), config);
  registryProcess = spawn(process.execPath, [join(repo, "node_modules/verdaccio/bin/verdaccio"), "--config", join(work, "verdaccio.yaml")], { detached: true, stdio: "ignore" });
  if (!(await until(() => answers(`${registry}-/ping`), 60))) { setup = "the local registry did not answer"; return; }
  // A throwaway user on this registry only; its token goes to a file under `work` and never to the output.
  const user = await fetch(`${registry}-/user/org.couchdb.user:e2e`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "e2e", password: randomBytes(16).toString("hex") }) });
  const token = ((await user.json()) as { token?: string }).token ?? "";
  const publishRc = join(work, "publish.npmrc");
  writeFileSync(publishRc, `//127.0.0.1:${PORTS.registry}/:_authToken=${token}\n`);
  for (const p of publicPackages()) {
    const done = spawnSync("pnpm", ["publish", "--registry", registry, "--no-git-checks"], { cwd: join(repo, "packages", p), encoding: "utf8", env: { ...process.env, NPM_CONFIG_USERCONFIG: publishRc }, maxBuffer: 64 * 1024 * 1024 });
    if (done.status !== 0) { setup = `pnpm publish of packages/${p} failed: ${`${done.stdout}${done.stderr}`.slice(-1500)}`; return; }
  }
}, 900_000);

afterAll(async () => {
  await stop(devProcess);
  await stop(registryProcess);
  for (const r of roots) rmSync(r, { recursive: true, force: true });
}, 300_000);

// ---- running the steps ----

interface Ran { readonly step: string; readonly status: number | null; readonly out: string }
const ran: Ran[] = [];
let cwd = app;
const exported: Record<string, string> = {};
/** The page's own port for the app, read as the free one this run gave `ortho dev`. */
const local = (s: string) => s.replace(/:8787\b/g, `:${PORTS.dev}`);

const runStep = async (raw: string): Promise<Ran> => {
  const step = local(raw);
  const cd = /^cd\s+(\S+)$/.exec(step);
  if (cd) { cwd = resolve(cwd, cd[1] ?? "."); return { step: raw, status: existsSync(cwd) ? 0 : 1, out: existsSync(cwd) ? "" : `no folder ${cwd}` }; }
  const exp = /^export\s+([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(step);
  if (exp) { exported[exp[1] ?? ""] = (exp[2] ?? "").replace(/^["']|["']$/g, ""); return { step: raw, status: 0, out: "" }; }
  const env = { ...plain(), ...exported };
  if (orthoRun("dev").test(step)) {
    const line = /--port\b/.test(step) ? step : `${step} --port ${PORTS.dev}`;
    devProcess = spawn("bash", ["-c", line], { cwd, env, detached: true });
    devProcess.stdout?.on("data", (d: Buffer) => devLog.push(d.toString()));
    devProcess.stderr?.on("data", (d: Buffer) => devLog.push(d.toString()));
    const up = await until(() => answers(`http://127.0.0.1:${PORTS.dev}/`), 240);
    return { step: raw, status: up ? 0 : 1, out: up ? devLog.join("") : `the app did not answer on 127.0.0.1:${PORTS.dev} within 240s: ${devLog.join("").slice(-2000)}` };
  }
  const done = spawnSync("bash", ["-c", step], { cwd, env, encoding: "utf8", timeout: 900_000, maxBuffer: 256 * 1024 * 1024 });
  return { step: raw, status: done.status, out: `${done.stdout}${done.stderr}` };
};

const ranOf = (i: number): Ran | undefined => ran[i];
const shown = (r: Ran | undefined) => (r === undefined ? "(not run: an earlier step failed)" : `\`${r.step}\` exited ${r.status}:\n${r.out.slice(-3000)}`);

/** Every file under a folder, by its path inside it, with its text. */
const treeOf = (dir: string, skip: ReadonlyArray<string> = []): ReadonlyMap<string, string> => {
  const out = new Map<string, string>();
  const go = (d: string) => {
    if (!existsSync(d)) return;
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const f = join(d, e.name);
      if (skip.includes(e.name)) continue;
      if (e.isDirectory()) go(f);
      else if (e.isFile()) out.set(relative(dir, f), readFileSync(f, "utf8"));
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
const made = () => join(app, NAME ?? "\u0000");
/** The app's own `ortho`: @orthograph/cli as installed in it from the registry, and the file its published `bin` names. */
const installedCli = (): { readonly dir: string; readonly bin: string; readonly version: string } | undefined => {
  const dir = join(made(), "node_modules/@orthograph/cli");
  if (!existsSync(join(dir, "package.json"))) return undefined;
  const manifest = JSON.parse(readFileSync(join(dir, "package.json"), "utf8")) as { version: string; bin?: string | Record<string, string> };
  const bin = typeof manifest.bin === "string" ? manifest.bin : manifest.bin?.["ortho"];
  return bin === undefined ? undefined : { dir: realpathSync(dir), bin: join(dir, bin), version: manifest.version };
};
const health = (url: string) =>
  spawnSync("node", ["generated/cli/src/main.ts", "system", "health", "--json"], { cwd: made(), env: { ...plain(), [`${PREFIX}_URL`]: url }, encoding: "utf8", timeout: 120_000 });

describe("09 the getting-started page, run as written (Goal 18, slice 7)", () => {
  it("the page exists and shows its steps in sh fences: an install or create, `ortho prove`, `ortho dev` and a call through the generated CLI, in that order", () => {
    expect(page, "docs/canon/getting-started.mdx does not exist").not.toBe("");
    expect(STEPS.length, "no step in a ```sh, ```bash or ```shell fence").toBeGreaterThan(0);
    expect(createAt, `no step creates an app (\`ortho new app <name>\` or \`npm create orthograph <name>\`); the steps are:\n${STEPS.join("\n")}`).toBeGreaterThanOrEqual(0);
    expect(proveAt, "no `ortho prove` step").toBeGreaterThan(createAt);
    expect(devAt, "no `ortho dev` step after `ortho prove`").toBeGreaterThan(proveAt);
    expect(toolAt, `no step after \`ortho dev\` runs the app's generated CLI (\`${NAME ?? "<name>"} …\` or \`node generated/cli/src/main.ts …\`)`).toBeGreaterThan(devAt);
  });

  it("every step is a plain command a reader types: no shell, and only npm, npx, pnpm, yarn, bun, ortho, the app's command or its generated CLI", () => {
    expect(page, "docs/canon/getting-started.mdx does not exist").not.toBe("");
    expect(refused).toEqual([]);
  });

  it("every step runs in an empty folder against Orthograph from a local registry, and exits 0", { timeout: 3_600_000 }, async () => {
    expect(page, "docs/canon/getting-started.mdx does not exist").not.toBe("");
    expect(STEPS.length, "no step in a ```sh, ```bash or ```shell fence").toBeGreaterThan(0);
    expect(refused, "a step that is not a plain command is not run").toEqual([]);
    expect(setup, "publishing Orthograph to the local registry").toBe("");
    for (const step of STEPS) {
      const r = await runStep(step);
      ran.push(r);
      expect(r.status, `step ${ran.length} of ${STEPS.length}: ${shown(r)}`).toBe(0);
    }
  });

  it("the create step makes the starter under the name it gives: examples/starter's blueprint and journeys, file for file, and @orthograph/cli as published for its `ortho`", { timeout: 300_000 }, () => {
    expect(ranOf(createAt)?.status, shown(ranOf(createAt))).toBe(0);
    expect(diff(treeOf(join(repo, "examples/starter/blueprint")), treeOf(join(made(), "blueprint"))), `${NAME}/blueprint/ against examples/starter/blueprint/`).toEqual([]);
    expect(diff(treeOf(join(repo, "examples/starter/journeys")), treeOf(join(made(), "journeys"))), `${NAME}/journeys/ against examples/starter/journeys/`).toEqual([]);
    const cli = installedCli();
    expect(cli, `${NAME}/node_modules/@orthograph/cli, with a \`bin\` named ortho`).toBeDefined();
    const want = (JSON.parse(readFileSync(join(repo, "packages/cli/package.json"), "utf8")) as { version: string }).version;
    expect(cli?.version, "the installed @orthograph/cli is the version this repository published").toBe(want);
    expect(cli?.dir ?? "", "installed from the registry into pnpm's store, not linked from elsewhere").toMatch(/node_modules\/\.pnpm\/@orthograph\+cli@/);
  });

  it("the app's generated/ is what its own `ortho generate` makes: a copy regenerated rewrites nothing", { timeout: 600_000 }, () => {
    const cli = installedCli();
    expect(cli, "the app's own ortho").toBeDefined();
    // Under the app's own name: the generator names the app after its folder.
    const copy = join(mkdtempSync(join(work, "regen-")), NAME ?? "app");
    mkdirSync(copy);
    for (const e of readdirSync(made())) if (e !== "node_modules") cpSync(join(made(), e), join(copy, e), { recursive: true });
    symlinkSync(join(made(), "node_modules"), join(copy, "node_modules"));
    const done = spawnSync("node", [cli?.bin ?? "", "generate"], { cwd: copy, env: plain(), encoding: "utf8", timeout: 540_000 });
    expect(done.status, `ortho generate in a copy: ${done.stdout}${done.stderr}`).toBe(0);
    expect(diff(treeOf(join(made(), "generated")), treeOf(join(copy, "generated"))), `${NAME}/generated/ against a fresh \`ortho generate\``).toEqual([]);
  });

  it("`ortho prove` is run on the whole app (no --empty, --only or --changed) and passes; and the app's own ortho, run by this check, proves every journey", { timeout: 900_000 }, () => {
    const step = STEPS[proveAt] ?? "";
    expect(step, "the prove step").not.toBe("");
    expect(step, "a prove that judges only part of the app").not.toMatch(/--(?:empty|only|changed)\b/);
    expect(ranOf(proveAt)?.status, shown(ranOf(proveAt))).toBe(0);
    const cli = installedCli();
    const done = spawnSync("node", [cli?.bin ?? "", "prove", "--env", "local", "--json"], { cwd: made(), env: plain(), encoding: "utf8", timeout: 840_000, maxBuffer: 256 * 1024 * 1024 });
    const verdict = (() => { try { return JSON.parse(done.stdout) as { passed?: boolean; totals?: { journeys?: number; journeysPassed?: number; failing?: number } }; } catch { return undefined; } })();
    expect(verdict, `ortho prove --env local --json printed no verdict: ${done.stdout.slice(-1500)}${done.stderr.slice(-1500)}`).toBeDefined();
    expect(verdict?.passed).toBe(true);
    expect(verdict?.totals?.journeys ?? 0, "journeys proved").toBeGreaterThan(0);
    expect(verdict?.totals?.journeysPassed).toBe(verdict?.totals?.journeys);
  });

  it("`ortho dev` runs the app: it answers, and the app's generated CLI, called by this check, gets its health from it", { timeout: 300_000 }, () => {
    expect(ranOf(devAt)?.status, shown(ranOf(devAt))).toBe(0);
    expect(devProcess?.exitCode ?? null, "ortho dev is still running when the tools are called").toBeNull();
    const up = health(`http://127.0.0.1:${PORTS.dev}`);
    expect(up.status, `system health against ortho dev: ${up.stdout}${up.stderr}`).toBe(0);
    const down = health(`http://127.0.0.1:${PORTS.closed}`);
    expect(down.status, `system health against a closed port: ${down.stdout}${down.stderr}`).not.toBe(0);
  });

  it("the page calls the generated CLI with `<APP>_URL` set, for the app's own name, and it answers", () => {
    expect(PREFIX, "an app name on the create step").toBeDefined();
    const sets = (urlSetAt >= 0 && urlSetAt <= toolAt) || new RegExp(`\\b${PREFIX}_URL=`).test(STEPS[toolAt] ?? "");
    expect(sets, `a step at or before the call sets \`${PREFIX}_URL\` (the generated CLI's variable for \`${NAME}\`)`).toBe(true);
    const other = [...page.matchAll(/\b([A-Z][A-Z0-9_]*)_(?:URL|TOKEN)\b/g)].map((m) => m[1]).filter((p) => p !== PREFIX && p !== "APP");
    expect(other, "a variable for another app than the one created").toEqual([]);
    expect(page, "the page names `<APP>_TOKEN`, what the generated tools sign in with").toContain("_TOKEN");
    expect(ranOf(toolAt)?.status, shown(ranOf(toolAt))).toBe(0);
  });

  it("the page's call, with `<APP>_URL` pointing at a closed port, fails: the tool talks to the app it is told to", { timeout: 300_000 }, () => {
    const call = ranOf(toolAt);
    expect(call?.status, shown(call)).toBe(0);
    const closed = `http://127.0.0.1:${PORTS.closed}`;
    const env = { ...plain(), ...exported, [`${PREFIX}_URL`]: closed };
    const line = local(STEPS[toolAt] ?? "").replace(new RegExp(`\\b${PREFIX}_URL=\\S+`), `${PREFIX}_URL=${closed}`);
    const done = spawnSync("bash", ["-c", line], { cwd, env, encoding: "utf8", timeout: 240_000 });
    expect(done.status, `\`${line}\` against a closed port exited ${done.status}: ${done.stdout}${done.stderr}`).not.toBe(0);
  });

  it("stopping `ortho dev` leaves nothing of the app running", { timeout: 60_000 }, async () => {
    await stop(devProcess);
    expect(spawnSync("pgrep", ["-fl", app], { encoding: "utf8" }).stdout.trim()).toBe("");
  });
});
