// Check 08 (M7.06: `brew install` of acme's CLI works from the real tap): the GitHub release and the Homebrew tap, run on this machine with real parts: the real `ortho publish --release` and `--push-tap` on a copy of acme under git, real
// git (a bare repository stands in for the tap `Open-Harness/homebrew-tap`), real Homebrew, and an HTTP server (`github-standin.ts`) for the three GitHub addresses (the API, the upload address a release names, the download address).
// THE SURFACE (what the builder makes; the pull request lists the options). `ortho publish --release [--root <acme>]`, off GitHub Actions or on it, reads the runner's variables: the tag (`GITHUB_REF_TYPE=tag`, `GITHUB_REF_NAME=v<semver>`:
// the version is the tag's, `v` dropped), `GITHUB_REPOSITORY` (`owner/repo`), `GITHUB_API_URL` (`https://api.github.com`, or here `http://127.0.0.1:<port>`: any other address is refused, so a stray variable cannot take the token
// elsewhere) and `GITHUB_SERVER_URL` (`https://github.com`, or here the same loopback address), `GH_TOKEN` (the job's `github.token`; sent as `Authorization: Bearer`, never printed), and `ORTHO_TAP_REMOTE` (a git address: the tap's).
// With no `ORTHO_REGISTRY` it sends nothing to npm. It refuses (exit 2) before it builds or sends anything when any of these is missing or wrong. Then: the CLI binary for this machine's platform (`<project>-<version>-<target>.tar.gz`);
// a GitHub release for the tag (looked up first, so a run can be started again); the tarball uploaded as an asset and `<tarball>.sha256` beside it (`<hex>  <tarball>`, as `sha256sum` writes it); the tap cloned from `ORTHO_TAP_REMOTE`
// into `.ortho/tap` and `Formula/<name>.rb` (`ORTHO_FORMULA`, else the project's) committed there, naming the release's download address `<GITHUB_SERVER_URL>/<repo>/releases/download/<tag>/<tarball>` and the sha256 of the bytes the
// release holds; nothing pushed. `ortho publish --push-tap` pushes that commit to `ORTHO_TAP_REMOTE` (as it is then: the workflow clones over https and pushes over ssh with the deploy key, set up by that step alone) and nothing else.
// A prerelease tag is refused (exit 2, a line naming `prerelease`): nothing is built or sent and the tap is untouched. NO NETWORK: `publish --release` and `--push-tap` run under `e2e/m1/deny-network.mjs` (a connection to any host that is not
// loopback ends the process), so a build that ignores `GITHUB_API_URL` or `ORTHO_TAP_REMOTE` shows up as NETWORK-DENIED. The Node binary the single executable is made from is the RUNNER'S OWN: this check puts a copy of the Node running it in
// `ORTHO_CACHE` where `internal/sea.ts` keeps the downloaded one (`<cache>/node-v<NODE_VERSION>-<target>/node`), so the build finds it and downloads nothing; a build that downloads Node instead fails here (curl is not covered by the guard, so a cold-cache
// download is also refused by the cache being the only one the run is given and by the missing `download-*` folder checked below). Homebrew must be installed: a machine without it FAILS this check (L2.05), it never skips. NOT JUDGED HERE: the real api.github.com and the real tap (the first release is the proof), the deploy key over ssh (the workflow's text is check 05).
// Red today on one reason: `--release` does not exist.
import { type SpawnOptions, spawn, spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type Standin, startStandin } from "./github-standin.ts";
import { cli, freePorts, repo } from "./support.ts";

const PORTS = freePorts("github");
const REPOSITORY = "acme/acme";
const TOKEN = "sentinel-token-71c4e0aa";
const id = randomBytes(3).toString("hex");
const tap = `ortho-m7-${id}/pub`;
const formula = `acme-m7-${id}`;
const full = `${tap}/${formula}`;
const parent = mkdtempSync(join(realpathSync(tmpdir()), "ortho-m7-08-"));
const root = join(parent, "acme");
const tapA = join(parent, "tap-a.git"), tapB = join(parent, "tap-b.git");
const brewHere = spawnSync("brew", ["--version"], { encoding: "utf8" }).status === 0;
const cache = join(parent, "ortho-cache");
const guard = `--import=${join(repo, "e2e/m1/deny-network.mjs")}`;
/** The version of Node the single executable is made from, as `internal/sea.ts` names it, and the platform this machine builds for. */
const nodeVersion = /NODE_VERSION = "([^"]+)"/.exec(readFileSync(join(repo, "packages/prove/src/modules/publish/internal/sea.ts"), "utf8"))![1]!;
const target = process.platform === "darwin" ? "darwin-arm64" : "linux-x64";
let github: Standin;

const git = (cwd: string, ...args: ReadonlyArray<string>) => {
  const r = spawnSync("git", ["-c", "user.name=m7", "-c", "user.email=m7@example.test", "-c", "commit.gpgsign=false", ...args], { cwd, encoding: "utf8" });
  expect(r.status, r.stderr).toBe(0);
  return r.stdout.trim();
};
/** A child process run to its end without blocking this one: the stand-in server is in this process. */
const exec = (command: string, args: ReadonlyArray<string>, options: SpawnOptions & { env: Record<string, string | undefined> }) => new Promise<{ status: number | null; said: string }>((done) => {
  const child = spawn(command, args, { ...options, env: Object.fromEntries(Object.entries(options.env).filter(([, v]) => v !== undefined)) as Record<string, string>, stdio: ["ignore", "pipe", "pipe"] });
  let said = "";
  child.stdout!.setEncoding("utf8").on("data", (c: string) => { said += c; });
  child.stderr!.setEncoding("utf8").on("data", (c: string) => { said += c; });
  const timer = setTimeout(() => child.kill("SIGKILL"), 800_000);
  child.on("close", (status) => { clearTimeout(timer); done({ status, said }); });
});
const BREW = { ...(process.env as Record<string, string>), HOMEBREW_NO_AUTO_UPDATE: "1", HOMEBREW_NO_ANALYTICS: "1", HOMEBREW_NO_INSTALL_CLEANUP: "1", HOMEBREW_NO_ENV_HINTS: "1" };
const brew = (...args: ReadonlyArray<string>) => exec("brew", args, { env: BREW });
const env = (extra: Record<string, string | undefined> = {}): Record<string, string | undefined> => ({
  PATH: process.env["PATH"] ?? "", HOME: process.env["HOME"], GITHUB_REF_TYPE: "tag", GITHUB_REF_NAME: "v1.1.0", GITHUB_REPOSITORY: REPOSITORY, GITHUB_API_URL: github.base, GITHUB_SERVER_URL: github.base,
  GH_TOKEN: TOKEN, ORTHO_TAP_REMOTE: tapA, ORTHO_FORMULA: formula, ORTHO_CACHE: cache, NODE_OPTIONS: guard, ...extra,
});
/** `ortho publish <flag>` on the copy of acme; the token is never in what it prints. */
const publish = async (flag: "--release" | "--push-tap", extra: Record<string, string | undefined> = {}) => {
  const r = await exec(process.execPath, [cli, "publish", flag, "--root", root], { cwd: root, env: env(extra) });
  expect(r.said, "the token must never be printed").not.toContain(TOKEN);
  expect(r.said, "nothing may leave this machine").not.toContain("NETWORK-DENIED");
  return r;
};
const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");
const tapHead = (repoPath: string) => git(repoPath, "rev-parse", "main");
const tarballName = () => [...github.assets.keys()].find((n) => n.endsWith(".tar.gz"))!;
const formulaIn = (clone: string) => readFileSync(join(clone, "Formula", `${formula}.rb`), "utf8");

beforeAll(async () => {
  github = await startStandin(PORTS.github, REPOSITORY);
  mkdirSync(join(cache, `node-v${nodeVersion}-${target}`), { recursive: true });
  copyFileSync(process.execPath, join(cache, `node-v${nodeVersion}-${target}`, "node"));
  // A copy of acme under git, outside the repository (its revision is a commit of its own), named `acme` as the project is (as publish.test.ts makes it).
  const acme = join(repo, "examples/acme");
  for (const part of ["blueprint", "generated", "journeys", "src", "package.json"]) cpSync(join(acme, part), join(root, part), { recursive: true, filter: (from) => !basename(from).startsWith(".") });
  mkdirSync(join(root, "node_modules/.bin"), { recursive: true });
  for (const entry of readdirSync(join(acme, "node_modules"))) if (entry !== ".bin") symlinkSync(join(acme, "node_modules", entry), join(root, "node_modules", entry));
  writeFileSync(join(root, "node_modules/.bin/tsc"), `#!/bin/sh\nexec "${join(repo, "node_modules/.bin/tsc")}" "$@"\n`, { mode: 0o755 });
  writeFileSync(join(root, "tsconfig.json"), JSON.stringify({ extends: join(acme, "tsconfig.json"), compilerOptions: { typeRoots: [join(repo, "node_modules/@types"), join(acme, "node_modules")] }, include: ["blueprint/**/*.ts", "generated/**/*.ts", "src/**/*.ts", "journeys/**/*.ts"] }));
  writeFileSync(join(root, ".gitignore"), "node_modules/\n.ortho/\n.wrangler/\n");
  git(root, "init", "-q", "-b", "main");
  git(root, "add", "-A");
  git(root, "commit", "-q", "-m", "acme");
  // The tap: a bare repository that already holds another project's formula, which a release must leave as it is.
  const seed = join(parent, "seed");
  mkdirSync(join(seed, "Formula"), { recursive: true });
  writeFileSync(join(seed, "Formula", "other.rb"), 'class Other < Formula\n  url "https://example.invalid/other.tar.gz"\nend\n');
  git(seed, "init", "-q", "-b", "main");
  git(seed, "add", "-A");
  git(seed, "commit", "-q", "-m", "other 1.0.0");
  git(parent, "clone", "-q", "--bare", seed, tapA);
  git(parent, "clone", "-q", "--bare", tapA, tapB);
}, 600_000);
afterAll(async () => {
  await github?.close();
  if (brewHere) {
    if ((await brew("list", "--formula")).said.split("\n").includes(formula)) {
      const cached = (await brew("--cache", full)).said.trim();
      await brew("uninstall", "--force", full);
      if (cached) rmSync(cached, { force: true });
    }
    if ((await brew("tap")).said.split("\n").includes(tap)) await brew("untap", tap);
  }
  rmSync(parent, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
});

describe("08: the GitHub release and the Homebrew tap (M7.06), on this machine", () => {
  const before = () => ({ a: tapHead(tapA), b: tapHead(tapB), heard: github.heard.length });
  /** What is wrong, and the name the refusal must say (so it is refused for that, not for something else). */
  const REFUSED: ReadonlyArray<readonly [string, Record<string, string | undefined>, RegExp]> = [
    ["no token", { GH_TOKEN: undefined }, /GH_TOKEN/], ["an empty token", { GH_TOKEN: "  " }, /GH_TOKEN/], ["no repository", { GITHUB_REPOSITORY: undefined }, /GITHUB_REPOSITORY/],
    ["a repository that is not owner/repo", { GITHUB_REPOSITORY: "acme" }, /GITHUB_REPOSITORY/], ["a repository that climbs", { GITHUB_REPOSITORY: "acme/../x" }, /GITHUB_REPOSITORY/],
    ["an API address that is another https host", { GITHUB_API_URL: "https://api.evil.example" }, /GITHUB_API_URL/], ["an API address that is http on another host", { GITHUB_API_URL: "http://evil.example" }, /GITHUB_API_URL/],
    ["a server address that is another host", { GITHUB_SERVER_URL: "https://evil.example" }, /GITHUB_SERVER_URL/], ["a branch, not a tag", { GITHUB_REF_TYPE: "branch", GITHUB_REF_NAME: "main" }, /tag/i],
    ["a tag that is not a version", { GITHUB_REF_NAME: "v1.1" }, /tag/i], ["no tap", { ORTHO_TAP_REMOTE: undefined }, /ORTHO_TAP_REMOTE/], ["a tap that is not there", { ORTHO_TAP_REMOTE: "/nonexistent/tap.git" }, /ORTHO_TAP_REMOTE/],
  ];
  it.each(REFUSED)("refuses with %s: exit 2, nothing built, sent or pushed", async (_n, extra, names) => {
    const b = before();
    const r = await publish("--release", extra);
    expect(r.status, r.said).toBe(2);
    expect(r.said).toMatch(names);
    expect(github.heard.length, "nothing was sent").toBe(b.heard);
    expect([tapHead(tapA), tapHead(tapB)]).toEqual([b.a, b.b]);
    expect(existsSync(join(root, ".ortho/tap")), "no tap clone").toBe(false);
    expect(existsSync(join(root, ".ortho/publish")), "nothing built").toBe(false);
  });

  it("a prerelease tag is refused: exit 2 naming it, nothing built or sent, the tap untouched", async () => {
    const b = before();
    const r = await publish("--release", { GITHUB_REF_NAME: "v1.2.0-next.1" });
    expect(r.status, r.said).toBe(2);
    expect(r.said).toMatch(/prerelease/i);
    expect(github.heard.length).toBe(b.heard);
    expect(existsSync(join(root, ".ortho/publish")), "nothing built").toBe(false);
    expect([tapHead(tapA), tapHead(tapB)]).toEqual([b.a, b.b]);
  });

  it("`--push-tap` with nothing released refuses and pushes nothing", async () => {
    const b = before();
    const r = await publish("--push-tap", { ORTHO_TAP_REMOTE: tapB });
    expect([r.status, tapHead(tapB)], r.said).toEqual([2, b.b]);
  });

  describe("`--release` at v1.1.0", () => {
    it("makes the GitHub release with the binary and its sha256, as the job, and sends the tap nothing", { timeout: 900_000 }, async () => {
      const b = before();
      const r = await publish("--release");
      expect(r.status, r.said).toBe(0);
      expect(readdirSync(cache).filter((n) => n.startsWith("download-")), "no download of Node was attempted").toEqual([]);
      expect([...github.releases.keys()]).toEqual(["v1.1.0"]);
      const mine = github.heard.slice(b.heard);
      expect(mine.length).toBeGreaterThan(0);
      for (const h of mine.filter((x) => !x.path.includes("/releases/download/"))) expect([h.path, h.authorization]).toEqual([h.path, `Bearer ${TOKEN}`]);
      const tarball = tarballName();
      expect(tarball).toMatch(/^acme-1\.1\.0-(darwin-arm64|linux-x64)\.tar\.gz$/);
      expect([...github.assets.keys()].sort()).toEqual([tarball, `${tarball}.sha256`]);
      expect(github.assets.get(tarball)!.length).toBeGreaterThan(1_000_000);
      expect(github.assets.get(`${tarball}.sha256`)!.toString("utf8")).toBe(`${sha(github.assets.get(tarball)!)}  ${tarball}\n`);
      expect([tapHead(tapA), tapHead(tapB)], "the tap's remote is untouched until the push").toEqual([b.a, b.b]);
    });

    it("commits a formula that names the release's download address and the sha256 of the bytes the release holds, beside the other project's", () => {
      const clone = join(root, ".ortho/tap");
      const tarball = tarballName();
      const text = formulaIn(clone);
      expect(text).toContain(`url "${github.base}/${REPOSITORY}/releases/download/v1.1.0/${tarball}"`);
      expect(text).toContain(`sha256 "${sha(github.assets.get(tarball)!)}"`);
      expect(text).toContain('version "1.1.0"');
      expect(text).not.toMatch(/file:\/\//);
      expect(existsSync(join(clone, "Formula/other.rb")), "the other project's formula is still there").toBe(true);
      expect(git(clone, "log", "--format=%s").split("\n")).toEqual([`${formula} 1.1.0`, "other 1.0.0"]);
    });

    it("run again for the same tag: exit 0, no second release, and the formula still pins the bytes the release holds", { timeout: 900_000 }, async () => {
      const tarball = tarballName(), held = Buffer.from(github.assets.get(tarball)!);
      const r = await publish("--release");
      expect(r.status, r.said).toBe(0);
      expect([...github.releases.keys()]).toEqual(["v1.1.0"]);
      expect(github.heard.filter((h) => h.method === "POST" && h.path === `/repos/${REPOSITORY}/releases`), "one release-creation request in all, none from the rerun").toHaveLength(1);
      expect(github.assets.get(tarball)!.equals(held), "an uploaded asset is never replaced").toBe(true);
      expect(formulaIn(join(root, ".ortho/tap"))).toContain(`sha256 "${sha(held)}"`);
    });
  });

  it("the stand-in itself answers as GitHub does: a second release for a tag is 422, and an upload's download address is the one that serves it", async () => {
    const again = await fetch(`${github.base}/repos/${REPOSITORY}/releases`, { method: "POST", headers: { authorization: `Bearer ${TOKEN}` }, body: JSON.stringify({ tag_name: "v1.1.0" }) });
    expect(again.status).toBe(422);
    const up = await fetch(`${github.base}/uploads/repos/${REPOSITORY}/releases/7/assets?name=probe.txt`, { method: "POST", headers: { authorization: `Bearer ${TOKEN}` }, body: "probe" });
    const { browser_download_url: where } = (await up.json()) as { browser_download_url: string };
    expect(where).toBe(`${github.base}/${REPOSITORY}/releases/download/v1.1.0/probe.txt`);
    expect(await (await fetch(where)).text()).toBe("probe");
    github.assets.delete("probe.txt");
  });

  describe("`--push-tap`", () => {
    it("pushes the formula's commit to the remote it is given, after the other project's, and to no other", async () => {
      const a = tapHead(tapA), oldB = tapHead(tapB);
      const r = await publish("--push-tap", { ORTHO_TAP_REMOTE: tapB });
      expect(r.status, r.said).toBe(0);
      expect(tapHead(tapA), "another tap is untouched").toBe(a);
      expect(git(tapB, "merge-base", "--is-ancestor", oldB, "main")).toBe("");
      expect(git(tapB, "log", "--format=%s", "main").split("\n")).toEqual([`${formula} 1.1.0`, "other 1.0.0"]);
      expect(git(tapB, "show", "main:Formula/other.rb")).toContain("other.tar.gz");
      expect(git(tapB, "show", `main:Formula/${formula}.rb`)).toContain(`${github.base}/${REPOSITORY}/releases/download/v1.1.0/${tarballName()}`);
    });
  });

  describe("real Homebrew, from the tap the release pushed to", () => {
    it("Homebrew is installed (a machine without it fails this check, never skips it)", () => {
      expect(brewHere, "`brew` is not installed: M7.06's done-when is `brew install` from the tap, so this check cannot pass without Homebrew (GitHub's ubuntu runners have it)").toBe(true);
    });

    it("`brew install <tap>/acme` fetches the release's tarball and runs the CLI, which prints its version", { timeout: 900_000 }, async () => {
      expect((await brew("tap", tap, tapB)).status).toBe(0);
      const installed = await brew("install", full);
      expect(installed.status, installed.said).toBe(0);
      const bin = join((await brew("--prefix", full)).said.trim(), "bin/acme");
      expect(spawnSync(bin, ["--version"], { encoding: "utf8" }).stdout.trim()).toBe("acme 1.1.0");
      // A real command of the real CLI, not a stub that prints its version: its help lists every group of operations the model declares.
      const model = JSON.parse(readFileSync(join(root, "generated/model/model.json"), "utf8")) as { operations: Record<string, unknown> };
      const groups = [...new Set(Object.keys(model.operations).map((n) => n.split(".")[0]!))];
      expect(groups.length).toBeGreaterThan(1);
      const help = spawnSync(bin, ["--help"], { encoding: "utf8", timeout: 60_000 });
      for (const g of groups) expect(help.stdout + help.stderr, `acme --help lists ${g}`).toContain(g);
      expect((await brew("test", full)).status, "brew test").toBe(0);
      expect(github.heard.some((h) => h.method === "GET" && h.path.endsWith(`/releases/download/v1.1.0/${tarballName()}`)), "brew fetched it from the release address").toBe(true);
    });

    it("a wrong sha256 fails the install: the tarball changed after the formula pinned it", { timeout: 900_000 }, async () => {
      const cached = (await brew("--cache", full)).said.trim();
      expect((await brew("uninstall", full)).status).toBe(0);
      if (cached) rmSync(cached, { force: true });
      const tarball = tarballName(), good = github.assets.get(tarball)!;
      github.assets.set(tarball, Buffer.concat([good, Buffer.from("tampered")]));
      const bad = await brew("install", full);
      github.assets.set(tarball, good);
      expect(bad.status, bad.said).not.toBe(0);
      expect(bad.said).toMatch(/SHA-?256 mismatch|checksum/i);
      expect((await brew("list", "--formula")).said.split("\n")).not.toContain(formula);
      const cachedBad = (await brew("--cache", full)).said.trim();
      if (cachedBad) rmSync(cachedBad, { force: true });
    });
  });
});
