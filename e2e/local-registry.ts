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
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const repo = join(import.meta.dirname, "..");
/** Checks 44 and 45's guard: loaded first in every process of the publish, it ends any connection to a host that is not loopback. */
export const GUARD = join(repo, "e2e/m1/deny-network.mjs");

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
  for (const k of Object.keys(env)) if (/^(npm|pnpm)_/i.test(k) || k === "NODE_OPTIONS" || k === "INIT_CWD") delete env[k];
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
  const own = publicPackages().map((p) => p.name).filter((n) => n !== "orthograph" && !n.startsWith("@orthograph/") && !base.includes(`'${n}':`))
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
export const publishAll = (registry: Registry, timeouts: { readonly build: number; readonly each: number }): string => {
  const built = spawnSync("pnpm", ["nx", "run-many", "-t", "build", "--outputStyle=static"], { cwd: repo, encoding: "utf8", env: { ...bare(), NX_DAEMON: "false" }, timeout: timeouts.build, maxBuffer: 256 * 1024 * 1024 });
  if (built.status !== 0) return `nx run-many -t build ${built.error ? `stopped: ${String(built.error)}` : "failed"}: ${`${built.stdout}${built.stderr}`.slice(-2000)}`;
  const env = { ...bare(), NPM_CONFIG_USERCONFIG: registry.publishRc, npm_config_update_notifier: "false", NODE_OPTIONS: `--import ${GUARD}` };
  for (const p of publicPackages()) {
    const done = spawnSync("pnpm", ["publish", "--registry", registry.url, "--tag", "next", "--no-git-checks"], { cwd: join(repo, "packages", p.dir), encoding: "utf8", env, timeout: timeouts.each, maxBuffer: 64 * 1024 * 1024 });
    if (done.status !== 0) return `pnpm publish of packages/${p.dir} ${done.error ? `stopped: ${String(done.error)}` : "failed"}: ${`${done.stdout}${done.stderr}`.slice(-1500)}`;
  }
  return "";
};

/** What the registry holds for a name: its versions, or [] when it has none. */
export const versionsOn = async (registry: Registry, name: string): Promise<ReadonlyArray<string>> => {
  const r = await fetch(`${registry.url}${name.replace("/", "%2f")}`, { signal: AbortSignal.timeout(30_000) }).catch(() => undefined);
  if (r === undefined || !r.ok) return [];
  return Object.keys(((await r.json()) as { versions?: Record<string, unknown> }).versions ?? {});
};
