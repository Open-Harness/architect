// Persisted PID files are claims, not process ownership. These tests use real detached processes and workerd.
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { Effect, Exit, Scope } from "effect";
import { Issuer } from "@orthograph/services";
import { freePort } from "../../../test/ports.ts";
import { afterAll, describe, expect, it } from "vitest";
import { Build } from "#modules/build/service.js";
import { Environments } from "./service.ts";

const parent = mkdtempSync(join(realpathSync(tmpdir()), "ortho-process-owner-"));
// Exercise wide inspection and unquoted process arguments containing spaces, beyond normal terminal widths.
const root = join(parent, "long-environment-path-".repeat(5), "project with spaces", "acme");
const shadow = join(parent, "shadow");
const acme = resolve(import.meta.dirname, "../../../../../examples/acme");
const services = Effect.runSync(Scope.make());
const run = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(effect);
const dir = (project: string, name: string) => join(project, ".ortho/environments", name);
const git = (...args: ReadonlyArray<string>) => {
  const result = spawnSync("git", ["-c", "user.name=ownership", "-c", "user.email=ownership@example.test", "-c", "commit.gpgsign=false", ...args], { cwd: root, encoding: "utf8" });
  expect(result.status, result.stderr).toBe(0);
};

const project = () => {
  if (existsSync(join(root, "package.json"))) return;
  mkdirSync(root, { recursive: true });
  for (const part of ["blueprint", "generated", "src", "journeys", "package.json"]) {
    cpSync(join(acme, part), join(root, part), { recursive: true, filter: (file) => !basename(file).startsWith(".") });
  }
  mkdirSync(join(root, "node_modules"));
  for (const entry of readdirSync(join(acme, "node_modules"))) if (entry !== ".bin") symlinkSync(join(acme, "node_modules", entry), join(root, "node_modules", entry));
  writeFileSync(join(root, ".gitignore"), "node_modules/\n.ortho/\n.wrangler/\n");
  git("init", "-q", "-b", "main"); git("add", "-A"); git("commit", "-q", "-m", "acme");
};

const alive = (child: ChildProcess) => {
  if (child.exitCode !== null || child.signalCode !== null) return false;
  try { process.kill(child.pid!, 0); return true; } catch { return false; }
};
const sentinel = async (args: ReadonlyArray<string> = []) => {
  const child = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)", "--", ...args], { detached: true, stdio: "ignore" });
  await once(child, "spawn");
  child.unref();
  return child;
};
const stopSentinel = async (child: ChildProcess) => {
  if (!alive(child)) return;
  const exited = once(child, "exit");
  child.kill("SIGTERM"); // Only the fresh child handle this test created, never the PID from a file.
  await exited;
};
const marker = (project: string, name: string, pid: number, port = freePort(), hints: object = {}) => {
  const at = dir(project, name);
  mkdirSync(at, { recursive: true });
  writeFileSync(join(at, "pid"), `${pid}\n`);
  writeFileSync(join(at, "port"), `${port}\n`);
  writeFileSync(join(at, "bundle.json"), JSON.stringify({ revision: "stale", sha256: "0".repeat(64), ...hints }));
  writeFileSync(join(at, "wrangler.jsonc"), "{}\n");
};
const absent = (project: string, name: string) => {
  expect(existsSync(join(dir(project, name), "pid"))).toBe(false);
  expect(existsSync(join(dir(project, name), "bundle.json"))).toBe(false);
  expect(existsSync(join(dir(project, name), "port"))).toBe(true);
  expect(existsSync(join(dir(project, name), "wrangler.jsonc"))).toBe(true);
};

afterAll(async () => {
  for (const project of [root, shadow]) for (const name of ["production", "staging", "logbook"]) await run(Environments.down({ root: project, name }));
  await run(Scope.close(services, Exit.void));
  rmSync(parent, { recursive: true, force: true });
});

describe("persisted environment process ownership", () => {
  it("down forgets a stale marker without signaling the unrelated detached sentinel it names", { timeout: 30_000 }, async () => {
    const child = await sentinel();
    try {
      marker(shadow, "production", child.pid!);
      await run(Environments.down({ root: shadow, name: "production" }));
      // Observe signal delivery, not merely ChildProcess fields before the exit event is dispatched.
      await new Promise((done) => setTimeout(done, 100));
      expect(alive(child), "the PID file does not own this process").toBe(true);
      absent(shadow, "production");
    } finally { await stopSentinel(child); }
  });

  it("a wrangler-word lookalike is down even when its arguments and metadata name this environment", { timeout: 30_000 }, async () => {
    const at = dir(shadow, "staging");
    const child = await sentinel(["wrangler", "dev", "--config", join(at, "wrangler.jsonc"), "--persist-to", join(at, "state")]);
    try {
      marker(shadow, "staging", child.pid!, freePort(), { config: join(at, "wrangler.jsonc"), persistTo: join(at, "state") });
      expect(await run(Environments.status({ root: shadow, name: "staging" }))).toEqual({ state: "down", name: "staging" });
      await run(Environments.down({ root: shadow, name: "staging" }));
      await new Promise((done) => setTimeout(done, 100));
      expect(alive(child)).toBe(true);
      absent(shadow, "staging");
    } finally { await stopSentinel(child); }
  });

  it("up preserves a stale sentinel, then status and down recognize the actual long-path wrangler", { timeout: 180_000 }, async () => {
    project();
    await run(Build.build(root));
    const child = await sentinel();
    try {
      marker(root, "production", child.pid!);
      const owned = await run(Environments.up({ root, name: "production" }));
      expect(alive(child)).toBe(true);
      expect(owned.pid).not.toBe(child.pid);
      expect(await run(Environments.status({ root, name: "production" }))).toMatchObject({ state: "up", pid: owned.pid });
      await run(Environments.down({ root, name: "production" }));
      expect(await run(Environments.status({ root, name: "production" }))).toEqual({ state: "down", name: "production" });
      expect(alive(child)).toBe(true);
      expect(() => process.kill(-owned.pid, 0), "the actual owned process group stopped").toThrow();
    } finally {
      await run(Environments.down({ root, name: "production" }));
      await stopSentinel(child);
    }
  });

  it("another environment's genuine wrangler survives stale markers that point at it", { timeout: 180_000 }, async () => {
    project();
    const owned = await run(Environments.up({ root, name: "production" }));
    try {
      marker(shadow, "production", owned.pid, owned.port, { config: join(dir(root, "production"), "wrangler.jsonc"), persistTo: join(dir(root, "production"), "state") });
      expect(await run(Environments.status({ root: shadow, name: "production" }))).toEqual({ state: "down", name: "production" });
      await run(Environments.down({ root: shadow, name: "production" }));
      expect(await run(Environments.status({ root, name: "production" }))).toMatchObject({ state: "up", pid: owned.pid });
      expect((await fetch(`${owned.url}/_ortho/bundle`, { headers: { connection: "close" } })).status).toBe(200);
    } finally { await run(Environments.down({ root, name: "production" })); }
  });

  it("recognizes its real logbook and preserves another logbook sharing the config but using different state", { timeout: 180_000 }, async () => {
    const { url: issuer } = await run(Issuer.start({ port: freePort() }).pipe(Scope.provide(services)));
    const policy = { issuer, repository: "ownership/ownership", refs: ["refs/heads/main"], workflows: ["ownership"] };
    const owned = await run(Environments.up({ root, name: "logbook", policy }));
    try {
      expect(await run(Environments.status({ root, name: "logbook" }))).toMatchObject({ state: "up", pid: owned.pid });
      marker(shadow, "logbook", owned.pid, owned.port, { persistTo: join(dir(root, "logbook"), "state") });
      expect(await run(Environments.status({ root: shadow, name: "logbook" }))).toEqual({ state: "down", name: "logbook" });
      await run(Environments.down({ root: shadow, name: "logbook" }));
      expect((await fetch(`${owned.url}/health`, { headers: { connection: "close" } })).status).toBe(200);
    } finally { await run(Environments.down({ root, name: "logbook" })); }
    expect(await run(Environments.status({ root, name: "logbook" }))).toEqual({ state: "down", name: "logbook" });
    expect(() => process.kill(-owned.pid, 0), "the owned logbook group stopped").toThrow();
  });
});
