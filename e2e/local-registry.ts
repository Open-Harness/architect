// Orthograph published to a local registry, as a user's install sees it: the one shared helper for every check that publishes for real
// (GOAL18-getting-started-acceptance). It is `tools/e2e/starter.sh`'s registry and publish steps in TypeScript, from the same config
// (`tools/e2e/verdaccio.yaml`), so a check never carries a copy of its own. starter.sh stays a shell script for the gate that runs it.
//
// HOW THE REGISTRY IS REACHED. Verdaccio, the pinned `verdaccio` package under Node, a process of the check: no container. It listens on
// 127.0.0.1 only (the config's `listen`), on a free port. Orthograph's own names (`orthograph`, `@orthograph/*` and any other public
// package's name) have no `proxy`, so they are served only from what this run published, never from npmjs. EVERY OTHER DEPENDENCY IS
// PROXIED TO npmjs by Verdaccio (`'**': proxy: npmjs`): a read, by Verdaccio, with no token. The publish itself runs under
// `e2e/m1/deny-network.mjs` (checks 44 and 45's guard): a connection to any host that is not loopback ends it, so nothing it sends can
// reach npmjs. The agents' network goes through a proxy that adds auth headers for npmjs; nothing here sends to npmjs at all, and every
// `npm_config_*` and `pnpm_config_*` of the caller (the proxy's included) is dropped from the environments this helper makes.
import { spawn, type ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/** The repository root. */
export const repo = join(import.meta.dirname, "..");
/** Checks 44 and 45's guard: loaded first in every process of the publish, it ends any connection to a host that is not loopback. */
export const GUARD = join(repo, "e2e/m1/deny-network.mjs");

/** Names served only from this run's publish, beside Orthograph's own (the third 🔍 review of #1145). */
export const LOCAL_ONLY = ["ortho", "create-orthograph"];

export interface PublicPackage { readonly dir: string; readonly name: string; readonly version: string }
/** Every public package under packages/: no `"private": true` (the set tools/release/preview.mjs lists). */
export const publicPackages = (): ReadonlyArray<PublicPackage> =>
  readdirSync(join(repo, "packages"), { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(repo, "packages", d.name, "package.json")))
    .map((d) => ({ dir: d.name, ...(JSON.parse(readFileSync(join(repo, "packages", d.name, "package.json"), "utf8")) as { name: string; version: string; private?: boolean }) }))
    .filter((p) => (p as { private?: boolean }).private !== true)
    .map(({ dir, name, version }) => ({ dir, name, version }))
    .sort((a, b) => a.name.localeCompare(b.name));

/** The caller's environment without its npm and pnpm settings (a proxy's, a token's, a registry's) or NODE_OPTIONS. */
export const bare = (): NodeJS.ProcessEnv => {
  const env: NodeJS.ProcessEnv = { ...process.env };
  for (const k of Object.keys(env)) if (/^(npm|pnpm)_/i.test(k) || k === "NODE_OPTIONS" || k === "NODE_PATH" || k === "INIT_CWD") delete env[k];
  return env;
};

const answers = (url: string): Promise<boolean> => fetch(url, { signal: AbortSignal.timeout(3_000) }).then((r) => r.ok, () => false);
const until = async (ok: () => Promise<boolean>, seconds: number): Promise<boolean> => {
  for (let i = 0; i < seconds * 2; i++) {
    if (await ok()) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
};

/** Stop a process group started detached, by its PID: TERM, then KILL after ten seconds. */
export const stopGroup = async (child: ChildProcess | undefined): Promise<void> => {
  if (child?.pid === undefined || child.exitCode !== null || child.signalCode !== null) return;
  try { process.kill(-child.pid, "SIGTERM"); } catch { /* already gone */ }
  if (!(await until(async () => child.exitCode !== null || child.signalCode !== null, 10))) {
    try { process.kill(-child.pid, "SIGKILL"); } catch { /* already gone */ }
  }
};

export interface Ran { readonly what: string; readonly status: number | null; readonly out: string; readonly err: string }
/** Run a command in a process group of its own and wait for it; past `timeout` the whole group is stopped (TERM, then KILL), not just
 * the direct child, so nothing a step started (a build's workers, prove's servers) outlives it. */
export const runGroup = (what: string, command: string, args: ReadonlyArray<string>, cwd: string, timeout: number, env: NodeJS.ProcessEnv): Promise<Ran> =>
  new Promise((done) => {
    const child = spawn(command, args, { cwd, env, detached: true, stdio: ["ignore", "pipe", "pipe"] });
    const out: string[] = []; const err: string[] = [];
    child.stdout?.on("data", (d: Buffer) => out.push(d.toString()));
    child.stderr?.on("data", (d: Buffer) => err.push(d.toString()));
    let late = "";
    const timer = setTimeout(() => { late = `\n(stopped: the group ran past ${timeout / 1000}s)`; void stopGroup(child); }, timeout);
    child.on("error", (e) => { clearTimeout(timer); done({ what, status: null, out: out.join(""), err: `${err.join("")}\n(could not start: ${String(e)})` }); });
    child.on("close", (status) => {
      clearTimeout(timer);
      // The step is over: anything it left in its group goes too.
      if (child.pid !== undefined) { try { process.kill(-child.pid, "SIGKILL"); } catch { /* the group is empty */ } }
      done({ what, status: late === "" ? status : null, out: out.join(""), err: `${err.join("")}${late}` });
    });
  });

export interface Registry {
  /** `http://127.0.0.1:<port>/`. */
  readonly url: string;
  /** The config Verdaccio runs with, as written. */
  readonly config: string;
  readonly process: ChildProcess;
  /** An npmrc holding a throwaway user's token for this registry only; it lives under the work folder and is never printed. */
  readonly publishRc: string;
}

/** Start Verdaccio from `tools/e2e/verdaccio.yaml` under `work`, with every public package's own name local-only. Fails with a sentence. */
export const startRegistry = async (work: string, port: number): Promise<Registry> => {
  const storage = join(work, "storage");
  mkdirSync(storage, { recursive: true });
  // The shared config allows `orthograph` and `@orthograph/*`; a public package named otherwise (`create-orthograph`) gets the same entry.
  const base = readFileSync(join(repo, "tools/e2e/verdaccio.yaml"), "utf8").replaceAll("__STORAGE__", storage).replaceAll("__PORT__", String(port));
  // Two more names are kept local, never read from npmjs: `ortho`, the command's name (someone else's package there), and
  // `create-orthograph` (not registered there; anyone could claim it). A step that asks for either gets this run's, or nothing.
  const own = [...new Set([...publicPackages().map((p) => p.name), ...LOCAL_ONLY])].filter((n) => n !== "orthograph" && !n.startsWith("@orthograph/") && !base.includes(`'${n}':`))
    .map((n) => `  '${n}':\n    access: $all\n    publish: $all\n    unpublish: $all\n`).join("");
  const config = base.replace(/^packages:\n/m, `packages:\n${own}`);
  writeFileSync(join(work, "verdaccio.yaml"), config);
  const child = spawn(process.execPath, [join(repo, "node_modules/verdaccio/bin/verdaccio"), "--config", join(work, "verdaccio.yaml")], { detached: true, stdio: "ignore", env: bare() });
  const url = `http://127.0.0.1:${port}/`;
  if (!(await until(() => answers(`${url}-/ping`), 60))) { await stopGroup(child); throw new Error(`the local registry did not answer on ${url} within 60s`); }
  const user = await fetch(`${url}-/user/org.couchdb.user:e2e`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "e2e", password: randomBytes(16).toString("hex") }), signal: AbortSignal.timeout(30_000) });
  const token = ((await user.json()) as { token?: string }).token ?? "";
  if (token === "") { await stopGroup(child); throw new Error("the local registry made no user to publish as"); }
  const publishRc = join(work, "publish.npmrc");
  writeFileSync(publishRc, `registry=${url}\n//127.0.0.1:${port}/:_authToken=${token}\n`);
  return { url, config, process: child, publishRc };
};

/** Build the packages (`nx run-many -t build`), then `pnpm publish --tag next` each public one to the registry, under the guard. Returns what failed, or "". */
export const publishAll = async (registry: Registry, timeouts: { readonly build: number; readonly each: number }): Promise<string> => {
  const built = await runGroup("nx run-many -t build", "pnpm", ["nx", "run-many", "-t", "build", "--outputStyle=static"], repo, timeouts.build, { ...bare(), NX_DAEMON: "false" });
  if (built.status !== 0) return `nx run-many -t build failed: ${`${built.out}${built.err}`.slice(-2000)}`;
  const env = { ...bare(), NPM_CONFIG_USERCONFIG: registry.publishRc, npm_config_update_notifier: "false", NODE_OPTIONS: `--import ${GUARD}` };
  for (const p of publicPackages()) {
    const done = await runGroup(`pnpm publish (packages/${p.dir})`, "pnpm", ["publish", "--registry", registry.url, "--tag", "next", "--no-git-checks"], join(repo, "packages", p.dir), timeouts.each, env);
    if (done.status !== 0) return `pnpm publish of packages/${p.dir} failed: ${`${done.out}${done.err}`.slice(-1500)}`;
  }
  return "";
};

/** What the registry holds for a name: its versions, or the sentence that says why it could not tell. Tried three times: a socket kept
 * alive across a long synchronous publish may have been closed by Verdaccio ("other side closed"). */
export const versionsOn = async (registry: Registry, name: string): Promise<ReadonlyArray<string> | string> => {
  let why = "";
  for (let i = 0; i < 3; i++) {
    const r = await fetch(`${registry.url}${name.replace("/", "%2f")}`, { signal: AbortSignal.timeout(30_000) }).catch((e: unknown) => `${String(e)} (${String((e as { cause?: unknown }).cause)})`);
    if (typeof r === "string") { why = `${name}: ${r}`; continue; }
    if (!r.ok) return `${name}: ${r.status} ${(await r.text()).slice(0, 200)}`;
    return Object.keys(((await r.json()) as { versions?: Record<string, unknown> }).versions ?? {});
  }
  return why;
};
