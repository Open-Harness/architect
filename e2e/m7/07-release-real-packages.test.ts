// Check 07 (M7.02: `npm view orthograph` shows the release): the real packages, built, released to a real Verdaccio at a version, installed from it into an empty folder, and the command they bring prints that version.
// Check 06 judges `tools/release/release.mjs` on a small workspace; this one judges the repository's own: which packages are the release (every `packages/*` that is not private: `orthograph`, `@orthograph/cli`, the preset among
// them), that they are built, that their versions agree (`check` with no `RELEASE_ROOT` runs on this repository, tag `v<their version>`), that a copy of them stamped at 9.8.7 and released from a workspace of its own installs
// from the registry (their dependencies come from npmjs.org through the registry's uplink, as `publish.test.ts` does), and that `ortho --version` prints 9.8.7 and not the `0.0.0` that `packages/cli/src/main.ts` says today.
// THE SURFACE: check 06's (`RELEASE_ROOT`, the tag in `GITHUB_REF_TYPE` and `GITHUB_REF_NAME`, the registry in `NPM_CONFIG_REGISTRY`). The CLI's version is the version in its own `package.json` (the published one, at run time,
// from source and from `dist`), so one number is the release's. Nothing is sent to npmjs.org (the tool runs under `e2e/m1/deny-network.mjs`); the install runs without it, because the registry's uplink fetches the dependencies.
// Red today on two reasons: the script does not exist, and `ortho --version` says 0.0.0.
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { Effect, Exit, Scope } from "effect";
import { Registry } from "@orthograph/services";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { freePorts, repo } from "./support.ts";

const script = join(repo, "tools/release/release.mjs");
const PORTS = freePorts("registry");
const registry = `http://127.0.0.1:${PORTS.registry}/`;
const parent = mkdtempSync(join(realpathSync(tmpdir()), "ortho-m7-07-"));
const services = Effect.runSync(Scope.make());
const VERSION = "9.8.7";
const guard = `--import=${join(repo, "e2e/m1/deny-network.mjs")}`;
type Manifest = { name: string; version: string; private?: boolean; dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
let npmrc = "";

/** Every package of the repository and its manifest, as the release reads them. */
const packages = readdirSync(join(repo, "packages")).map((d) => ({ dir: join(repo, "packages", d), folder: d, json: JSON.parse(readFileSync(join(repo, "packages", d, "package.json"), "utf8")) as Manifest }));
const released = packages.filter((p) => p.json.private !== true);

const tool = (command: string, env: Record<string, string>) => {
  expect(existsSync(script), "tools/release/release.mjs does not exist").toBe(true);
  const home = join(parent, "home");
  mkdirSync(home, { recursive: true });
  const r = spawnSync(process.execPath, [script, command], { cwd: repo, encoding: "utf8", timeout: 600_000, env: { PATH: process.env["PATH"] ?? "", HOME: home, GITHUB_REF_TYPE: "tag", NODE_OPTIONS: guard, npm_config_cache: join(parent, "npm-cache"), ...env } });
  return { status: r.status, said: `${r.stdout}${r.stderr}` };
};

/** The built packages copied into a workspace of their own, each stamped at VERSION, their `workspace:` dependencies linked to each other (what an installed checkout has, and pnpm needs to rewrite them). */
const stamped = () => {
  const root = mkdtempSync(join(parent, "ws-"));
  writeFileSync(join(root, "pnpm-workspace.yaml"), "packages:\n  - packages/*\n");
  writeFileSync(join(root, "package.json"), JSON.stringify({ name: "copy", private: true }));
  for (const p of packages) {
    const to = join(root, "packages", p.folder);
    cpSync(p.dir, to, { recursive: true, filter: (from) => !/(^|\/)(node_modules|src|test|\.nx|tmp)$/.test(from) });
    const json = JSON.parse(readFileSync(join(to, "package.json"), "utf8")) as Manifest;
    if (json.private !== true) json.version = VERSION;
    writeFileSync(join(to, "package.json"), JSON.stringify(json, null, 2));
  }
  for (const p of packages) for (const name of Object.keys({ ...p.json.dependencies, ...p.json.devDependencies })) {
    const sibling = packages.find((q) => q.json.name === name);
    if (sibling === undefined) continue;
    const link = join(root, "packages", p.folder, "node_modules", name);
    mkdirSync(dirname(link), { recursive: true });
    symlinkSync(join(root, "packages", sibling.folder), link);
  }
  return root;
};
const packument = async (name: string) => {
  const get = () => fetch(`${registry}${name.replace("/", "%2f")}`);
  const r = await get().catch(get);
  return r.status === 404 ? undefined : ((await r.json()) as { "dist-tags": Record<string, string>; versions: Record<string, unknown> });
};

beforeAll(async () => {
  const dir = join(parent, "services");
  mkdirSync(dir);
  npmrc = (await Effect.runPromise(Registry.start({ dir, port: PORTS.registry }).pipe(Scope.provide(services)))).npmrc;
  const built = spawnSync("pnpm", ["nx", "run-many", "-t", "build", "--outputStyle=static"], { cwd: repo, encoding: "utf8", env: { ...process.env, NX_DAEMON: "false" }, timeout: 600_000 });
  expect(built.status, built.stdout + built.stderr).toBe(0);
}, 900_000);
afterAll(async () => {
  await Effect.runPromise(Scope.close(services, Exit.void));
  rmSync(parent, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
});

describe("07: the repository's own packages, released to a registry and installed from it (M7.02)", () => {
  it("the release is the public packages, and the front door, the CLI and the preset are among them", () => {
    const names = released.map((p) => p.json.name);
    for (const name of ["orthograph", "@orthograph/cli", "@orthograph/preset"]) expect(names, name).toContain(name);
    expect(packages.filter((p) => p.json.private === true).map((p) => p.json.name), "what is private stays out of the release").toContain("@orthograph/services");
  });

  it("their versions agree with one tag: `check` on this repository, with no RELEASE_ROOT, passes at that version and refuses at another", () => {
    const version = released.find((p) => p.json.name === "orthograph")!.json.version;
    const agree = tool("check", { GITHUB_REF_NAME: `v${version}` });
    expect(agree.status, agree.said).toBe(0);
    for (const p of released) expect(agree.said, p.json.name).toContain(`${p.json.name}@${version}`);
    expect(agree.said).not.toContain("@orthograph/services");
    const other = tool("check", { GITHUB_REF_NAME: "v7.7.7" });
    expect(other.status, other.said).toBe(1);
  });

  describe(`a release at ${VERSION}`, () => {
    let published: { status: number | null; said: string };
    beforeAll(() => {
      published = tool("publish", { RELEASE_ROOT: stamped(), GITHUB_REF_NAME: `v${VERSION}`, NPM_CONFIG_REGISTRY: registry, npm_config_registry: registry, NPM_CONFIG_USERCONFIG: npmrc });
    }, 900_000);

    it("publishes every public package at the tag's version, under `latest`, and nothing else", async () => {
      expect(published.status, published.said).toBe(0);
      for (const p of released) {
        const found = await packument(p.json.name);
        expect([p.json.name, found && Object.keys(found.versions), found?.["dist-tags"]]).toEqual([p.json.name, [VERSION], { latest: VERSION }]);
      }
      for (const p of packages.filter((q) => q.json.private === true)) expect(await packument(p.json.name), `${p.json.name} is private`).toBeUndefined();
    });

    it("installs from the registry into an empty folder, and `ortho --version` prints the version", { timeout: 900_000 }, () => {
      expect(published.status, published.said).toBe(0);
      const fresh = mkdtempSync(join(parent, "fresh-"));
      writeFileSync(join(fresh, "package.json"), JSON.stringify({ name: "fresh", private: true, type: "module" }));
      writeFileSync(join(fresh, "empty-npmrc"), "");
      const installed = spawnSync("npm", ["install", `@orthograph/cli@${VERSION}`, `orthograph@${VERSION}`, "--registry", registry, "--ignore-scripts", "--no-audit", "--no-fund", "--cache", join(parent, "npm-cache"), "--userconfig", join(fresh, "empty-npmrc")], { cwd: fresh, encoding: "utf8", timeout: 800_000 });
      expect(installed.status, installed.stdout + installed.stderr).toBe(0);
      // Without colour: CI sets FORCE_COLOR, which wraps the words in ANSI codes; a script reading the version gets plain text.
      const version = spawnSync(join(fresh, "node_modules/.bin/ortho"), ["--version"], { encoding: "utf8", cwd: fresh, timeout: 120_000, env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" } });
      expect(version.stdout.trim(), version.stderr).toMatch(/^ortho v?9\.8\.7$/);
      // Every package of the release that the CLI needs resolved at that version, not at one of npmjs.org's.
      const tree = JSON.parse(spawnSync("npm", ["ls", "--all", "--json", "--userconfig", join(fresh, "empty-npmrc")], { cwd: fresh, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).stdout) as { dependencies?: Record<string, { version: string }> };
      expect(tree.dependencies?.["orthograph"]?.version).toBe(VERSION);
      expect(tree.dependencies?.["@orthograph/cli"]?.version).toBe(VERSION);
      const front = spawnSync(process.execPath, ["--input-type=module", "-e", "const m = await import('orthograph'); console.log(typeof m)"], { cwd: fresh, encoding: "utf8" });
      expect(front.stdout.trim(), front.stderr).toBe("object");
    });
  });
});
