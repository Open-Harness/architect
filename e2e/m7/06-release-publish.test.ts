// Check 06 (M7.02; credentials 1 and 2 of `design/decisions/M7-release.md`): the release's npm half, run for real against a real Verdaccio and a real npm.
// `node tools/release/release.mjs check | publish` (Goal 15 owns `tools/release/`; plain Node, nothing imported from outside the repository) works on a workspace folder: `RELEASE_ROOT` (the repository's own root when unset),
// whose `packages/*` are the packages; the ones with no `"private": true` are the release. The tag is `GITHUB_REF_TYPE=tag` and `GITHUB_REF_NAME=v<semver>` (what the runner sets). The registry is npm's own `NPM_CONFIG_REGISTRY` (or `npm_config_registry`: pnpm reads the lower case)
// and `NPM_CONFIG_USERCONFIG` (here the throwaway user of a local Verdaccio; in the workflow there is none: trusted publishing signs the publish in with the job's id token).
// THE SURFACE. `check`: exit 0 when every public package's version is the tag's, one line each (`<name>@<version>`) and no private package named; exit 1 when one differs, a line starting `::error::` naming that package and both
// versions; exit 2 when the tag is not `v<major>.<minor>.<patch>[-<prerelease>]` or is not a tag at all, or there are no packages. `publish`: `check` first, then each public package, from its folder, with `pnpm publish` (which
// writes `workspace:` ranges as the version), `--tag latest` for a release; a package whose built folder is missing (its `publishConfig` names `dist/...`, and there is none) refuses the whole run before the first send (exit 2).
// A version a registry already has is left alone and the run goes on (a run can be started again after half a release). A prerelease tag (`v1.1.0-rc.1`, `v2.4.0-next.1`) is refused by `check` and by `publish` (exit 1 or 2, an `::error::` line naming
// the rule, nothing sent): prereleases are M1.51's `next` publish, never this workflow's (the lead's call 2). "Not built" means the package's `dist/` folder may exist but lacks the file its `publishConfig` names (`main`, or a `bin`), so a tool that
// only tests for the folder misses it. Off GitHub Actions (`GITHUB_ACTIONS` is not `true`) it publishes only to a registry it was given, never to npmjs.org: with none given, or with npm's own, it exits 2 before sending.
// HOW IT IS JUDGED. A workspace of four packages (`orthograph`, a library, a CLI, a private one) written fresh for each case, a Verdaccio started here, the real tool, the real `pnpm` and `npm` it runs, an install from the registry
// in an empty folder. The refusals run first, each against an empty registry, and show nothing reached it. NOT JUDGED HERE: provenance and trusted publishing (npm's own, first real run is the proof; the workflow's text is check 05),
// and the real set of packages and their build (check 07). Red today on one reason: the script does not exist.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect, Exit, Scope } from "effect";
import { Registry } from "@orthograph/services";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { freePorts, repo } from "./support.ts";

const script = join(repo, "tools/release/release.mjs");
let registry = "";
const parent = mkdtempSync(join(realpathSync(tmpdir()), "ortho-m7-06-"));
let services: Scope.Closeable = Effect.runSync(Scope.make());
const PUBLIC = ["orthograph", "@orthograph/fx-lib", "@orthograph/fx-cli"] as const;
const PRIVATE = "@orthograph/fx-private";
let npmrc = "";
let token = "";
let nth = 0;

const folderOf = (name: string) => name.replace(/^@orthograph\//, "");
/** A workspace of the four packages at `version`, built (each has the `dist` its `publishConfig` names). `skew` puts one public package at another version; `unbuilt` leaves one without its `dist`. */
const workspace = (version: string, options: { skew?: [string, string]; unbuilt?: string } = {}) => {
  const root = mkdtempSync(join(parent, "ws-"));
  writeFileSync(join(root, "pnpm-workspace.yaml"), "packages:\n  - packages/*\n");
  writeFileSync(join(root, "package.json"), JSON.stringify({ name: "fx-root", private: true, version: "0.0.0" }));
  const make = (name: string, extra: Record<string, unknown>, files: Record<string, string>, priv = false) => {
    const dir = join(root, "packages", folderOf(name));
    mkdirSync(join(dir, "dist"), { recursive: true });
    const own = options.skew?.[0] === name ? options.skew[1] : version;
    writeFileSync(join(dir, "package.json"), JSON.stringify({ name, version: priv ? "0.0.0" : own, type: "module", files: ["dist"], ...(priv ? { private: true } : { publishConfig: { access: "public", main: "./dist/index.js" } }), ...extra }, null, 2));
    if (options.unbuilt !== name) for (const [file, text] of Object.entries(files)) writeFileSync(join(dir, "dist", file), text);
  };
  make("orthograph", {}, { "index.js": "export const name = 'orthograph';\n" });
  make("@orthograph/fx-lib", { dependencies: { orthograph: "workspace:*" } }, { "index.js": "export { name } from 'orthograph';\n" });
  make("@orthograph/fx-cli", { dependencies: { "@orthograph/fx-lib": "workspace:*", orthograph: "workspace:*" }, bin: { ortho: "./dist/main.js" }, publishConfig: { access: "public", bin: { ortho: "./dist/main.js" } } },
    { "main.js": "#!/usr/bin/env node\nimport { readFileSync } from 'node:fs';\nconsole.log(JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version);\n" });
  make(PRIVATE, {}, { "index.js": "" }, true);
  // The repository is installed when it is released from, so the workspace links are there (pnpm will not write `workspace:` ranges without them).
  const installed = spawnSync("pnpm", ["install", "--offline", "--ignore-scripts", "--no-frozen-lockfile", "--config.minimum-release-age=0"], { cwd: root, encoding: "utf8", env: { ...process.env, HOME: join(parent, "home") } });
  expect(installed.status, installed.stdout + installed.stderr).toBe(0);
  return root;
};

const tool = (command: string, root: string, env: Record<string, string | undefined> = {}) => {
  expect(existsSync(script), "tools/release/release.mjs does not exist").toBe(true);
  const home = join(parent, "home");
  mkdirSync(home, { recursive: true });
  const given: Record<string, string | undefined> = { PATH: process.env["PATH"] ?? "", HOME: home, RELEASE_ROOT: root, GITHUB_REF_TYPE: "tag", GITHUB_REF_NAME: "v2.3.4", NPM_CONFIG_REGISTRY: registry, npm_config_registry: registry, NPM_CONFIG_USERCONFIG: npmrc, npm_config_cache: join(parent, "npm-cache"), COREPACK_ENABLE_STRICT: "0", ...env };
  // Whatever the tool does, nothing it starts may leave this machine: a connection to any host that is not loopback ends that process (e2e/m1/deny-network.mjs), so a publish that went to npmjs.org would fail, not publish.
  given["NODE_OPTIONS"] = `--import=${join(repo, "e2e/m1/deny-network.mjs")}`;
  const r = spawnSync(process.execPath, [script, command], { cwd: root, encoding: "utf8", env: Object.fromEntries(Object.entries(given).filter(([, v]) => v !== undefined)) as Record<string, string>, timeout: 300_000 });
  const said = `${r.stdout}${r.stderr}`;
  expect(said, "the registry's token must never be printed").not.toContain(token);
  return { status: r.status, said };
};
const packument = async (name: string) => {
  const get = () => fetch(`${registry}${name.replace("/", "%2f")}`);
  const r = await get().catch(get);
  return r.status === 404 ? undefined : ((await r.json()) as { "dist-tags": Record<string, string>; versions: Record<string, { dependencies?: Record<string, string> }> });
};
const onRegistry = async () => (await Promise.all([...PUBLIC, PRIVATE].map(async (n) => [n, await packument(n)] as const))).filter(([, p]) => p !== undefined).map(([n]) => n);

// Every test has a registry of its own (its own storage and port), so none depends on what another left there.
beforeEach(async () => {
  services = Effect.runSync(Scope.make());
  const port = freePorts("registry").registry;
  const dir = join(parent, `services-${++nth}`);
  mkdirSync(dir);
  const started = await Effect.runPromise(Registry.start({ dir, port }).pipe(Scope.provide(services)));
  registry = started.url;
  npmrc = started.npmrc;
  token = /_authToken=(\S+)/.exec(readFileSync(npmrc, "utf8"))![1]!;
}, 120_000);
afterEach(async () => {
  await Effect.runPromise(Scope.close(services, Exit.void));
});
afterAll(() => {
  rmSync(parent, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
});

describe("06: the release's npm half (M7.02), against a real registry", () => {
  describe("`check`: the tag and every package's version agree", () => {
    it("agree: exit 0, every public package named at the version, the private one not", () => {
      const r = tool("check", workspace("2.3.4"));
      expect(r.status, r.said).toBe(0);
      for (const name of PUBLIC) expect(r.said).toContain(`${name}@2.3.4`);
      expect(r.said).not.toContain(PRIVATE);
    });
    it.each(PUBLIC)("%s alone at another version: exit 1, ::error:: naming it and both versions", (name) => {
      const r = tool("check", workspace("2.3.4", { skew: [name, "2.3.5"] }));
      expect(r.status, r.said).toBe(1);
      expect(r.said).toMatch(/^::error::.*$/m);
      const line = r.said.split("\n").find((l) => l.startsWith("::error::") && l.includes(name))!;
      expect(line, r.said).toBeDefined();
      expect(line).toContain("2.3.4");
      expect(line).toContain("2.3.5");
    });
    it("a private package at another version is no disagreement", () => {
      expect(tool("check", workspace("2.3.4")).status).toBe(0);
    });
    it.each([["a branch", "branch", "main"], ["a tag without the v", "tag", "2.3.4"], ["two numbers", "tag", "v2.3"], ["four numbers", "tag", "v2.3.4.5"], ["a double v", "tag", "vv2.3.4"],
      ["a trailing dash", "tag", "v2.3.4-"], ["words", "tag", "vnext"], ["nothing", "tag", ""], ["a tag that is a path", "tag", "v2.3.4/../x"],
      ["a prerelease that is a path", "tag", "v2.3.4-x/../y"], ["a trailing space", "tag", "v2.3.4 "], ["a leading space", "tag", " v2.3.4"]] as const)("%s is not a release tag: exit 2", (_n, type, name) => {
      const r = tool("check", workspace("2.3.4"), { GITHUB_REF_TYPE: type, GITHUB_REF_NAME: name });
      expect(r.status, r.said).toBe(2);
      expect(r.said).toMatch(/::error::/);
    });
    it.each(["v2.3.4-rc.1", "v2.3.4-next.1", "v2.3.4-0"])("a valid prerelease tag %s, every package at it: refused, naming the rule (prereleases are M1.51's)", (name) => {
      const r = tool("check", workspace(name.slice(1)), { GITHUB_REF_NAME: name });
      expect([1, 2], r.said).toContain(r.status);
      expect(r.said).toMatch(/^::error::.*prerelease/im);
    });
    it("no packages: exit 2", () => {
      const root = mkdtempSync(join(parent, "empty-"));
      writeFileSync(join(root, "pnpm-workspace.yaml"), "packages:\n  - packages/*\n");
      expect(tool("check", root).status).toBe(2);
    });
  });

  describe("`publish` refuses, before it sends anything, what it should not send", () => {
    it.each([
      ["a tag that disagrees with one package", () => workspace("2.3.4", { skew: ["@orthograph/fx-cli", "2.3.5"] }), {}, [1]],
      ["a package that is not built", () => workspace("2.3.4", { unbuilt: "@orthograph/fx-lib" }), {}, [2]],
      ["a prerelease tag with every package at it", () => workspace("2.4.0-rc.1"), { GITHUB_REF_NAME: "v2.4.0-rc.1" }, [1, 2]],
      ["a name that is not a tag", () => workspace("2.3.4"), { GITHUB_REF_TYPE: "branch", GITHUB_REF_NAME: "main" }, [2]],
      ["no registry, off GitHub Actions", () => workspace("2.3.4"), { NPM_CONFIG_REGISTRY: undefined, npm_config_registry: undefined }, [2]],
      ["npm's own registry, off GitHub Actions", () => workspace("2.3.4"), { NPM_CONFIG_REGISTRY: "https://registry.npmjs.org/", npm_config_registry: "https://registry.npmjs.org/" }, [2]],
      ["npm's own registry spelled another way", () => workspace("2.3.4"), { NPM_CONFIG_REGISTRY: "http://registry.npmjs.org", npm_config_registry: "http://registry.npmjs.org" }, [2]],
    ] as const)("%s: nothing reaches the registry", async (_n, make, env, statuses) => {
      const r = tool("publish", make(), { ...env, GITHUB_ACTIONS: undefined });
      expect(statuses as ReadonlyArray<number>, r.said).toContain(r.status);
      expect(r.said).not.toContain("NETWORK-DENIED");
      expect(await onRegistry()).toEqual([]);
    });
  });

  describe("`publish`, a release", () => {
    it("puts every public package at the tag's version under `latest`, and the private one nowhere", async () => {
      const r = tool("publish", workspace("2.3.4"));
      expect(r.status, r.said).toBe(0);
      expect((await onRegistry()).sort()).toEqual([...PUBLIC].sort());
      for (const name of PUBLIC) {
        const p = (await packument(name))!;
        expect([name, Object.keys(p.versions), p["dist-tags"]]).toEqual([name, ["2.3.4"], { latest: "2.3.4" }]);
      }
      // The packages say `workspace:*` in the repository and the version they were released at on the registry: what a consumer's install resolves.
      expect((await packument("@orthograph/fx-lib"))!.versions["2.3.4"]!.dependencies).toEqual({ orthograph: expect.stringMatching(/^[\^~]?2\.3\.4$/) });
      expect((await packument("@orthograph/fx-cli"))!.versions["2.3.4"]!.dependencies).toEqual({ "@orthograph/fx-lib": expect.stringMatching(/^[\^~]?2\.3\.4$/), orthograph: expect.stringMatching(/^[\^~]?2\.3\.4$/) });
    });

    it("installs in an empty folder, and the command it brings prints the tag's version", () => {
      const released = tool("publish", workspace("2.3.4"));
      expect(released.status, released.said).toBe(0);
      const fresh = mkdtempSync(join(parent, "fresh-"));
      writeFileSync(join(fresh, "package.json"), JSON.stringify({ name: "fresh", private: true, type: "module" }));
      writeFileSync(join(fresh, "empty-npmrc"), "");
      const installed = spawnSync("npm", ["install", "@orthograph/fx-cli@2.3.4", "--registry", registry, "--no-audit", "--no-fund", "--cache", join(parent, "npm-cache"), "--userconfig", join(fresh, "empty-npmrc")], { cwd: fresh, encoding: "utf8", timeout: 120_000 });
      expect(installed.status, installed.stdout + installed.stderr).toBe(0);
      expect(spawnSync(join(fresh, "node_modules/.bin/ortho"), [], { encoding: "utf8" }).stdout.trim()).toBe("2.3.4");
      expect(spawnSync(process.execPath, ["--input-type=module", "-e", "import { name } from '@orthograph/fx-lib'; console.log(name)"], { cwd: fresh, encoding: "utf8" }).stdout.trim()).toBe("orthograph");
    });

    it("run again after it went through: exit 0, nothing changes (a run can be started again after half a release)", async () => {
      expect(tool("publish", workspace("2.3.4")).status).toBe(0);
      const r = tool("publish", workspace("2.3.4"));
      expect(r.status, r.said).toBe(0);
      for (const name of PUBLIC) expect(Object.keys((await packument(name))!.versions), name).toEqual(["2.3.4"]);
    });

    it("run again after only some went out: the rest go, the ones there are left alone", async () => {
      const root = workspace("2.3.5");
      const first = tool("publish", workspace("2.3.5", { unbuilt: "@orthograph/fx-cli" }), { GITHUB_REF_NAME: "v2.3.5" });
      expect([first.status]).toEqual([2]);
      // One by hand, as a half-finished earlier run would have left it.
      const lib = spawnSync("pnpm", ["publish", "--no-git-checks", "--access", "public", "--registry", registry], { cwd: join(root, "packages/fx-lib"), encoding: "utf8", env: { ...process.env, NPM_CONFIG_USERCONFIG: npmrc, HOME: join(parent, "home") } });
      expect(lib.status, lib.stdout + lib.stderr).toBe(0);
      const r = tool("publish", root, { GITHUB_REF_NAME: "v2.3.5" });
      expect(r.status, r.said).toBe(0);
      for (const name of PUBLIC) expect(Object.keys((await packument(name))!.versions), name).toContain("2.3.5");
    });

    it("a prerelease tag after a release is refused: nothing new on the registry, `latest` where it was", async () => {
      expect(tool("publish", workspace("2.3.5"), { GITHUB_REF_NAME: "v2.3.5" }).status).toBe(0);
      const r = tool("publish", workspace("2.4.0-next.1"), { GITHUB_REF_NAME: "v2.4.0-next.1" });
      expect([1, 2], r.said).toContain(r.status);
      expect(r.said).toMatch(/::error::.*prerelease/i);
      for (const name of PUBLIC) {
        const p = (await packument(name))!;
        expect([name, Object.keys(p.versions), p["dist-tags"]]).toEqual([name, ["2.3.5"], { latest: "2.3.5" }]);
      }
    });
  });
});
