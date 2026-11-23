// L2.08 (D3 #126): `/_world/*` (the cast, the facts, the registry of worlds) answers only in an environment that hosts worlds.
// Staging and production answer 404 before any handler runs, and their API and MCP route carry on. Real wrangler and workerd
// on a copy of acme under git, on free ports (staging and the test environment each start a collector process).
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { Effect } from "effect";
import { afterAll, describe, expect, it } from "vitest";
import { Build } from "#modules/build/service.js";
import { Environments } from "./service.ts";

const acme = resolve(import.meta.dirname, "../../../../../examples/acme");
const visible = (from: string) => !basename(from).startsWith(".");
const git = (root: string, ...args: ReadonlyArray<string>) =>
  spawnSync("git", ["-c", "user.name=l2", "-c", "user.email=l2@example.test", "-c", "commit.gpgsign=false", ...args], { cwd: root, encoding: "utf8" }).stdout.trim();

const copyUnderGit = () => {
  const parent = mkdtempSync(join(realpathSync(tmpdir()), "ortho-l208-"));
  const root = join(parent, "acme");
  for (const part of ["blueprint", "generated", "src", "journeys", "package.json"]) cpSync(join(acme, part), join(root, part), { recursive: true, filter: visible });
  mkdirSync(join(root, "node_modules"));
  for (const entry of readdirSync(join(acme, "node_modules"))) if (entry !== ".bin") symlinkSync(join(acme, "node_modules", entry), join(root, "node_modules", entry));
  writeFileSync(join(root, ".gitignore"), "node_modules/\n.ortho/\n.wrangler/\n");
  git(root, "init", "-q", "-b", "main");
  git(root, "add", "-A");
  git(root, "commit", "-q", "-m", "acme");
  return { root, remove: () => rmSync(parent, { recursive: true, force: true }) };
};

const run = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(effect);
const project = copyUnderGit();
const at = (base: string, path: string, method = "GET", body?: string) => fetch(`${base}${path}`, { method, ...(body === undefined ? {} : { body }) });

afterAll(async () => {
  for (const name of ["staging", "production", "test"]) await run(Environments.down({ root: project.root, name }));
  project.remove();
});

describe("the world's front door", () => {
  it("is closed in staging and production before any handler runs, and open where worlds live", { timeout: 600_000 }, async () => {
    const { root } = project;
    await run(Build.build(root));
    const staging = await run(Environments.up({ root, name: "staging" }));
    const production = await run(Environments.up({ root, name: "production" }));
    const test = await run(Environments.up({ root, name: "test" }));

    const door = [["/_world/cast", "POST", JSON.stringify({ names: ["ada"] })], ["/_world/facts/journal?trace=x", "GET"], ["/_world/facts/record?table=allowance&id=x", "GET"], ["/_world/health", "GET"], ["/_world/worlds", "GET"], ["/_world/worlds", "POST", JSON.stringify({ id: "w", lifetimeMs: 1000 })]] as const;
    for (const env of [staging, production]) {
      for (const [path, method, body] of door) expect([env.name, path, (await at(env.url, path, method, body)).status]).toEqual([env.name, path, 404]);
      // What the environment is for still answers.
      expect((await at(env.url, "/_ortho/bundle")).status).toBe(200);
      expect((await at(env.url, "/mcp", "POST", "{}")).status).toBe(401);
      expect((await at(env.url, "/person/sign-up", "POST", "{}")).status).not.toBe(404);
    }
    // The test environment hosts worlds: its registry and facts answer.
    expect((await at(test.url, "/_world/worlds")).status).toBe(200);
    expect((await at(test.url, "/_world/facts/journal?trace=x")).status).toBe(200);
  });
});
