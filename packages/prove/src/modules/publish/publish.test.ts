// L2.06's done-when checks, through the `ortho publish` command on a copy of acme under git: the dry run lists exactly what would
// go out and sends nothing; `--local` puts `@acme/sdk@1.1.0` and `@acme/cli@1.1.0` on a real Verdaccio, installable in a fresh folder;
// the formula it commits to the tap installs with `brew` and runs; a prerelease never takes `latest`. Real wrangler and workerd for the
// logbook, a real OIDC issuer and a real registry (Verdaccio under Node), both @orthograph/services processes, real Homebrew, each on a free port.
import { freePorts } from "../../../test/ports.ts";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { randomBytes } from "node:crypto";
import { Effect, Exit, Scope } from "effect";
import { Issuer, Registry } from "@orthograph/services";
import type { Model } from "@orthograph/compiler";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Environments } from "#modules/environments/service.js";
import { Releases } from "#modules/releases/service.js";
import { Worlds } from "#modules/world/service.js";
import { Publish } from "./service.ts";
import { hostTarget } from "./internal/sea.ts";
import { publishOrthograph } from "../../../test/orthograph-package.ts";

const PORTS = freePorts("registry", "logbook", "issuer", "world");
const repo = resolve(import.meta.dirname, "../../../../..");
const acme = join(repo, "examples/acme");
const cli = join(repo, "packages/cli/src/main.ts");
const id = randomBytes(3).toString("hex");
const services = Effect.runSync(Scope.make());
const git = (cwd: string, ...args: ReadonlyArray<string>) => {
  const r = spawnSync("git", ["-c", "user.name=l206", "-c", "user.email=l206@example.test", "-c", "commit.gpgsign=false", ...args], { cwd, encoding: "utf8" });
  expect(r.status, r.stderr).toBe(0);
  return r.stdout.trim();
};

// A copy of acme under git, outside the repository (its revision is a commit of its own), named `acme` as the project is.
const parent = mkdtempSync(join(realpathSync(tmpdir()), "ortho-l206-"));
const root = join(parent, "acme");
for (const part of ["blueprint", "generated", "journeys", "src", "package.json"]) cpSync(join(acme, part), join(root, part), { recursive: true, filter: (from) => !basename(from).startsWith(".") });
mkdirSync(join(root, "node_modules/.bin"), { recursive: true });
for (const entry of readdirSync(join(acme, "node_modules"))) if (entry !== ".bin") symlinkSync(join(acme, "node_modules", entry), join(root, "node_modules", entry));
writeFileSync(join(root, "node_modules/.bin/tsc"), `#!/bin/sh\nexec "${join(repo, "node_modules/.bin/tsc")}" "$@"\n`, { mode: 0o755 });
writeFileSync(join(root, "tsconfig.json"), JSON.stringify({ extends: join(acme, "tsconfig.json"), compilerOptions: { typeRoots: [join(repo, "node_modules/@types"), join(acme, "node_modules")] }, include: ["blueprint/**/*.ts", "generated/**/*.ts", "src/**/*.ts", "journeys/**/*.ts"] }));
writeFileSync(join(root, ".gitignore"), "node_modules/\n.ortho/\n.wrangler/\n");
git(root, "init", "-q", "-b", "main");
git(root, "add", "-A");
git(root, "commit", "-q", "-m", "acme");
const first = git(root, "rev-parse", "--short", "HEAD");

const issuer = `http://127.0.0.1:${PORTS.issuer}/ortho`;
const registry = `http://127.0.0.1:${PORTS.registry}/`;
const npmrc = join(parent, "services", "npmrc");
const tap = `ortho-l206-${id}/pub`;
const formula = `acme-l206-${id}`;
const full = `${tap}/${formula}`;
const env: Record<string, string> = {
  ...(process.env as Record<string, string>),
  ORTHO_OIDC_ISSUER: issuer, ORTHO_OIDC_CLIENT: "ci-main", ORTHO_OIDC_REPOSITORY: "acme/acme", ORTHO_OIDC_REF: "refs/heads/main", ORTHO_OIDC_WORKFLOW: "ortho",
  ORTHO_REGISTRY: registry, NPM_CONFIG_USERCONFIG: npmrc, ORTHO_FORMULA: formula,
  HOMEBREW_NO_AUTO_UPDATE: "1", HOMEBREW_NO_ANALYTICS: "1", HOMEBREW_NO_INSTALL_CLEANUP: "1", HOMEBREW_NO_ENV_HINTS: "1",
};

/** What `ortho <args>` printed and how it ended. */
const ortho = (...args: ReadonlyArray<string>) => {
  const r = spawnSync(process.execPath, [cli, ...args, "--root", root], { cwd: root, encoding: "utf8", env, maxBuffer: 64 * 1024 * 1024, timeout: 900_000 });
  const out = `${r.stdout}${r.stderr}`;
  return { status: r.status, out, lines: out.split("\n") };
};
const say = (lines: Array<string>) => (line: string) => Effect.sync(() => void lines.push(line));
const dist = async (name: string) => {
  // A kept-alive connection the registry closed during a long step fails once.
  const get = () => fetch(`${registry}${name.replace("/", "%2f")}`);
  const r = await get().catch(get);
  return r.status === 404 ? undefined : ((await r.json()) as { "dist-tags": Record<string, string>; versions: Record<string, unknown> });
};
const brewHere = spawnSync("brew", ["--version"], { encoding: "utf8" }).status === 0;
const brew = (...args: ReadonlyArray<string>) => spawnSync("brew", args, { encoding: "utf8", env, timeout: 600_000 });

let world: Scope.Closeable | undefined;
beforeAll(async () => {
  const dir = join(parent, "services");
  mkdirSync(dir);
  // The OIDC server the logbook trusts, and the logbook; a release 1.0.0 recorded from a model without `allowance.revoke`, so that today's model is a minor.
  await Effect.runPromise(Issuer.start({ port: PORTS.issuer, dir, config: { tokenCallbacks: [{ issuerId: "ortho", tokenExpiry: 600, requestMappings: [{
    requestParam: "client_id", match: "ci-main", claims: { sub: "repo:acme/acme:ref:refs/heads/main", aud: ["ortho-logbook"], repository: "acme/acme", ref: "refs/heads/main", workflow: "ortho" } }] }] } }).pipe(Scope.provide(services)));
  // A throwaway user on this registry; its token is in `npmrc` and nowhere else.
  await Effect.runPromise(Registry.start({ dir, port: PORTS.registry }).pipe(Scope.provide(services)));
  expect(existsSync(npmrc)).toBe(true);
  // The SDK and the CLI depend on orthograph, so the registry holds it, as the starter's script publishes it.
  const { built, published } = publishOrthograph(repo, registry, env);
  expect(built.status, built.stdout + built.stderr).toBe(0);
  expect(published?.status, `${published?.stdout}${published?.stderr}`).toBe(0);

  const policy = { issuer, repository: "acme/acme", refs: ["refs/heads/main"], workflows: ["ortho"] };
  const logbook = (await Effect.runPromise(Environments.up({ root, name: "logbook", port: PORTS.logbook, policy }))).url;
  const model = JSON.parse(readFileSync(join(root, "generated/model/model.json"), "utf8")) as { operations: Record<string, unknown> };
  delete model.operations["allowance.revoke"];
  await Effect.runPromise(Releases.record({ logbook, env, model: model as unknown as Model, revision: first, version: "1.0.0" }));
}, 900_000);

afterAll(async () => {
  if (world) await Effect.runPromise(Scope.close(world, Exit.void));
  // Our own tap and formula only: uninstall, then untap.
  if (brewHere && brew("list", "--formula").stdout.split("\n").includes(formula)) {
    const cached = brew("--cache", full).stdout.trim();
    brew("uninstall", "--force", full);
    if (cached) rmSync(cached, { force: true });
  }
  if (brewHere && brew("tap").stdout.split("\n").includes(tap)) brew("untap", tap);
  await Effect.runPromise(Environments.down({ root, name: "logbook" }));
  await Effect.runPromise(Scope.close(services, Exit.void));
  rmSync(parent, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
});

describe("ortho publish", () => {
  it("--dry-run lists exactly what would go out, and sends nothing", { timeout: 300_000 }, async () => {
    expect(ortho("version", "--next").lines).toContain("1.1.0");
    const said = ortho("publish", "--dry-run");
    expect(said.status, said.out).toBe(0);
    const target = hostTarget() ?? `${process.platform}-${process.arch}`;
    expect(said.lines, said.out).toEqual(expect.arrayContaining([
      expect.stringMatching(new RegExp(`^npm @acme/sdk@1\\.1\\.0 --tag latest to http://127\\.0\\.0\\.1:${PORTS.registry}/ {2}\\(\\d+ files`)),
      expect.stringMatching(new RegExp(`^npm @acme/cli@1\\.1\\.0 --tag latest to http://127\\.0\\.0\\.1:${PORTS.registry}/ {2}\\(\\d+ files`)),
      expect.stringMatching(/^ {2}dist\/index\.js {2}\d+ B$/), expect.stringMatching(/^ {2}dist\/main\.js {2}\d+ B$/),
      expect.stringMatching(/^ {2}types\/generated\/sdk\/src\/index\.d\.ts {2}\d+ B$/),
      expect.stringMatching(new RegExp(`^binary acme-1\\.1\\.0-${target}\\.tar\\.gz `)),
      `homebrew acme/tap: Formula/${formula}.rb in .ortho/tap`,
      "skipped github releases (cloud pass)", "skipped npmjs.org (cloud pass)",
    ]));
    // Nothing went anywhere: the registry has neither package, and there is no tap.
    expect(await dist("@acme/sdk")).toBeUndefined();
    expect(await dist("@acme/cli")).toBeUndefined();
    expect(existsSync(join(root, ".ortho/tap"))).toBe(false);
  });

  it("without a registry, --local says so and exits 2; with neither flag it says how to use it", { timeout: 60_000 }, () => {
    const none = spawnSync(process.execPath, [cli, "publish", "--local", "--root", root], { cwd: root, encoding: "utf8", env: { ...env, ORTHO_REGISTRY: "" } });
    expect(none.status, none.stderr).toBe(2);
    expect(none.stderr).toContain("no registry: set ORTHO_REGISTRY");
    const bare = ortho("publish");
    expect(bare.status, bare.out).toBe(2);
    expect(bare.out).toContain("usage: ortho publish --dry-run | --local");
  });

  // The registry itself gives a package's very first version `latest`, whatever tag it was published under (Verdaccio does, and
  // taking `latest` off again is undone at once), so what is asserted for an empty package is `next`; what a prerelease must never
  // do is take `latest` from a release, and that is asserted after the release below.
  const prereleaseOf = async (version: string) => {
    const lines: Array<string> = [];
    const next = await Effect.runPromise(Publish.prerelease({ root, env, version }));
    await Effect.runPromise(Publish.run({ root, env, environment: "staging", version: next, mode: "publish", localTap: false, say: say(lines) }));
    expect(lines, lines.join("\n")).toContain(`npm @acme/sdk@${next} published --tag next to ${registry}`);
    return next;
  };

  it("a prerelease goes out under `next`, numbered one past the last", { timeout: 300_000 }, async () => {
    for (const n of [1, 2]) {
      const version = await prereleaseOf("1.1.0");
      expect(version).toBe(`1.1.0-next.${n}`);
      expect((await dist("@acme/sdk"))?.["dist-tags"]["next"], `after ${version}`).toBe(version);
      expect((await dist("@acme/cli"))?.["dist-tags"]["next"]).toBe(version);
    }
  });

  it("--local puts @acme/sdk@1.1.0 and @acme/cli@1.1.0 on the registry, `latest` on them, and a fresh folder installs and runs them", { timeout: 900_000 }, async () => {
    const said = ortho("publish", "--local");
    expect(said.status, said.out).toBe(0);
    expect(said.lines, said.out).toEqual(expect.arrayContaining([
      `npm @acme/sdk@1.1.0 published --tag latest to ${registry}`, `npm @acme/cli@1.1.0 published --tag latest to ${registry}`,
      expect.stringMatching(/^binary acme-1\.1\.0-[a-z0-9-]+\.tar\.gz sha256:[0-9a-f]{64} /),
      "skipped github releases (cloud pass)", "skipped npmjs.org (cloud pass)",
    ]));
    // The prerelease numbers went on; `latest` is the release.
    expect((await dist("@acme/sdk"))?.["dist-tags"]).toEqual({ next: "1.1.0-next.2", latest: "1.1.0" });
    expect((await dist("@acme/cli"))?.["dist-tags"]).toEqual({ next: "1.1.0-next.2", latest: "1.1.0" });

    const fresh = join(parent, "fresh");
    mkdirSync(fresh);
    writeFileSync(join(fresh, "package.json"), JSON.stringify({ name: "fresh", private: true, type: "module" }));
    writeFileSync(join(parent, "npmrc-empty"), "");
    const installed = spawnSync("npm", ["install", "@acme/sdk@1.1.0", "@acme/cli@1.1.0", "--registry", registry, "--ignore-scripts", "--no-audit", "--no-fund", "--cache", join(parent, "npm-cache"), "--userconfig", join(parent, "npmrc-empty")], { cwd: fresh, encoding: "utf8", timeout: 600_000 });
    expect(installed.status, installed.stdout + installed.stderr).toBe(0);
    const sdk = spawnSync(process.execPath, ["--input-type=module", "-e", "import * as sdk from '@acme/sdk'; console.log(Object.keys(sdk).sort().join(','))"], { cwd: fresh, encoding: "utf8" });
    expect(sdk.stdout.trim(), sdk.stderr).toContain("Acme,Credential,Errors,InvalidPayload,allowance");
    const version = spawnSync(join(fresh, "node_modules/.bin/acme"), ["--version"], { encoding: "utf8" });
    expect(version.stdout.trim(), version.stderr).toBe("acme 1.1.0");
    // The SDK's declarations resolve for a consumer: the real thing is typed, and a name it doesn't have is an error.
    writeFileSync(join(fresh, "use.ts"), 'import * as sdk from "@acme/sdk";\nexport const layer: (url: string) => unknown = sdk.layer;\n// @ts-expect-error not in the SDK\nexport const nope = sdk.nothingLikeThis;\n');
    const typed = spawnSync(join(repo, "node_modules/.bin/tsc"), ["--noEmit", "--strict", "--skipLibCheck", "--module", "nodenext", "--moduleResolution", "nodenext", "--target", "es2024", "--types", "", join(fresh, "use.ts")], { cwd: fresh, encoding: "utf8" });
    expect(typed.stdout + typed.stderr, "tsc over a consumer of @acme/sdk").toBe("");

    // Again: what is already on the registry is left alone.
    const again = ortho("publish", "--local");
    expect(again.status, again.out).toBe(0);
    expect(again.lines).toContain(`npm @acme/sdk@1.1.0 is already on ${registry}: left alone`);
  });

  it("a prerelease published after a release never takes `latest` from it", { timeout: 300_000 }, async () => {
    expect(await prereleaseOf("1.2.0")).toBe("1.2.0-next.1");
    for (const name of ["@acme/sdk", "@acme/cli"]) expect((await dist(name))?.["dist-tags"], name).toEqual({ next: "1.2.0-next.1", latest: "1.1.0" });
    // And a pnpm-style publish without a tag is what the dist-tag rule exists to prevent: the same prerelease, asked for by `npm install`, is not what a bare install gives.
    const bare = spawnSync("npm", ["view", "@acme/sdk", "version", "--registry", registry, "--userconfig", join(parent, "npmrc-empty"), "--cache", join(parent, "npm-cache")], { encoding: "utf8" });
    expect(bare.stdout.trim(), bare.stderr).toBe("1.1.0");
  });

  it.skipIf(!brewHere)("`brew install <tap>/<formula>` installs the CLI binary, which prints its version and `ok` from a running world", { timeout: 900_000 }, async () => {
    const formulaFile = join(root, ".ortho/tap/Formula", `${formula}.rb`);
    const text = readFileSync(formulaFile, "utf8");
    const tarball = /url "file:\/\/([^"\n]+)"/.exec(text)![1]!;
    const sums = readFileSync(tarball);
    expect(tarball).toContain(join(root, ".ortho/publish/1.1.0/run-"));
    expect(text).toContain(`sha256 "${(await import("node:crypto")).createHash("sha256").update(sums).digest("hex")}"`);
    // One commit per run that changed the formula (the binary is built again each run, so its hash is new): the newest is this version's.
    expect(git(join(root, ".ortho/tap"), "log", "--format=%s").split("\n")[0]).toBe(`${formula} 1.1.0`);

    expect(brew("tap", tap, join(root, ".ortho/tap")).status).toBe(0);
    const installed = brew("install", full);
    expect(installed.status, installed.stdout + installed.stderr).toBe(0);
    const bin = join(brew("--prefix", full).stdout.trim(), "bin/acme");
    expect(spawnSync(bin, ["--version"], { encoding: "utf8" }).stdout.trim()).toBe("acme 1.1.0");

    // The binary is a client: `acme system health` against a world that is running prints `ok`.
    world = Effect.runSync(Scope.make());
    const running = await Effect.runPromise(Worlds.start({ root, port: PORTS.world, name: "l206" }).pipe(Scope.provide(world)));
    const health = spawnSync(bin, ["system", "health"], { encoding: "utf8", env: { ...env, ACME_URL: running.url }, timeout: 60_000 });
    expect(health.stdout.trim(), health.stderr).toBe("ok");
    expect(brew("test", full).status, "brew test").toBe(0);
    // What Homebrew downloaded (it keeps a copy of the tarball) goes with the formula.
    const cached = brew("--cache", full).stdout.trim();
    expect(brew("uninstall", full).status).toBe(0);
    if (cached) rmSync(cached, { force: true });
    expect(brew("untap", tap).status).toBe(0);
    expect(brew("tap").stdout.split("\n")).not.toContain(tap);
  });
});
