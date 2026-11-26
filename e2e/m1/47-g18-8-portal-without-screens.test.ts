// Check 47 (Goal 18, slice 8, K44 call 2, issue #1066): the portal ships without its screens, and says so. The alpha's portal answers
// its server and its blueprint feed as today; asking for the screens says plainly that they are not in this release, not a 404 and not
// a crash; and nothing a published package builds from needs the HeroUI Pro licence. The requirements, one describe each:
//   A  the screens: with no client installed (what a published `@orthograph/portal` is: no `dist/client`), every GET under `/portal`
//      is 501 `text/html` saying "not in this release" and naming Preview (`portal-screens.ts`, the top, holds the surface);
//   B  the data and the rules of reading, as today: blueprint, snapshot, an unknown data path, a POST (controls: they pass today);
//   C  in a real world on workerd, from a project whose installed `@orthograph/portal` has no `dist/client`, with the licence token
//      unset: `ortho build` exits 0 and ships no client, the feed answers, and A holds over HTTP;
//   D  the licence: building any package that is published builds no package that needs HeroUI Pro (the `build` task graph of every
//      public package, read from nx, holds no project that declares `@heroui-pro/*`), and the published `@orthograph/portal` tarball
//      holds no client and depends on no UI package.
// What a builder owes: a client that is not installed answers A (`packages/portal/src/modules/server/internal/client.ts`'s 404 becomes
// the notice), and `portal`'s build stops depending on `portal-ui` (the client build, which needs the licence, is a target that no
// package's `build` waits for). A built client, where CI has one, is still served at `/portal` (checks 21 and 27 keep passing).
// Every judge is proved fair in the "controls" below: a correct stand-in passes, and each planted wrong answer is named.
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect, Exit, Scope } from "effect";
import { PortalServer } from "@orthograph/portal/server";
import { Worlds } from "@orthograph/prove";
import { afterAll, describe, expect, it } from "vitest";
import { freePort } from "./clients.ts";
import { feed, methods, screens, seenOf, blueprint, things, type Ask, type Seen } from "./portal-screens.ts";
import { acme, copyOf, repo } from "./support.ts";

// ---- the portal's server in this process: today's, a correct stand-in, and the plants ----

/** The real server, as a Worker holds it with no client installed (`env` has no `PORTAL_ASSETS`), or with one (`assets`). */
const real = (assets?: { fetch: (request: Request) => Promise<Response> }): Ask => async (path, method = "GET") =>
  seenOf(await Effect.runPromise(PortalServer.serve(blueprint, new Request(`http://portal${path}`, { method }), assets === undefined ? {} : { PORTAL_ASSETS: assets })));

const NOTICE = "<!doctype html><title>Portal</title><p>The portal's screens are not in this release (Preview). Its data is at /_portal/v1/blueprint.</p>";
const notice = (over: Partial<Seen> = {}): Seen => ({ status: 501, type: "text/html; charset=utf-8", body: NOTICE, etag: null, allow: null, ...over });
const isScreen = (path: string) => path === "/portal" || path.startsWith("/portal/");
/** A correct stand-in: the real data, and the notice for the screens (using nothing a handler cannot reach: the request's path and method). */
const correct: Ask = (path, method = "GET") => method === "GET" && isScreen(path) ? Promise.resolve(notice()) : real()(path, method);
/** A plant: the correct stand-in with one answer changed. `change` returns undefined to leave an answer as it is. */
const plant = (change: (path: string, method: string) => Seen | undefined): Ask => async (path, method = "GET") => change(path, method) ?? correct(path, method);

describe("47 A: asking for the screens says they are not in this release", () => {
  it("with no client installed, every request for a screen is 501, as HTML, saying so and naming the release", async () => {
    expect(await screens(real()), "today a missing client is a 404 \"not installed\" text").toEqual([]);
  });

  it("the client a build installed, where CI has one, is still served at /portal (checks 21 and 27 keep passing)", async () => {
    const shell = "<!doctype html><script type=\"module\" src=\"/portal/assets/app.js\"></script>";
    const asked: string[] = [];
    const ask = real({ fetch: async (request) => { const path = new URL(request.url).pathname; asked.push(path); return path === "/" ? new Response(shell, { headers: { "content-type": "text/html" } }) : new Response("no file", { status: 404 }); } });
    const seen = await ask("/portal/things/allowance");
    expect(seen.status).toBe(200);
    expect(seen.body).toBe(shell);
    expect(asked, "a route is not a file: the client's shell answers it").toEqual(["/things/allowance", "/"]);
  });
});

describe("47 B: the data and the rules of reading are as today", () => {
  it("the blueprint (ETag the digest, the model's things), the snapshot and an unknown data path answer as they do now", async () => {
    expect(await feed(real())).toEqual([]);
  });
  it("a POST is 405 with allow GET, HEAD, to the screens and to the data", async () => {
    expect(await methods(real())).toEqual([]);
  });
});

describe("47 controls: each judge passes a correct stand-in and names each planted wrong answer", () => {
  it("a correct stand-in passes all three judges", async () => {
    expect(await screens(correct)).toEqual([]);
    expect(await feed(correct)).toEqual([]);
    expect(await methods(correct)).toEqual([]);
    expect(things.length, "the blueprint has things to compare").toBeGreaterThan(1);
  });

  const wrongScreens: ReadonlyArray<readonly [string, Ask, RegExp]> = [
    ["a 404 (today's)", plant((p) => isScreen(p) ? notice({ status: 404 }) : undefined), /status 404, not 501/],
    ["a 200 page", plant((p) => isScreen(p) ? notice({ status: 200 }) : undefined), /status 200, not 501/],
    ["a 500", plant((p) => isScreen(p) ? notice({ status: 500 }) : undefined), /status 500, not 501/],
    ["a crash (throws)", async (p, m) => { if (isScreen(p)) throw new Error("boom"); return correct(p, m); }, /threw/],
    ["the notice for /portal only, a 404 below it", plant((p) => isScreen(p) && p !== "/portal" ? notice({ status: 404 }) : undefined), /GET \/portal\/things\/allowance: status 404/],
    ["the notice below /portal only, a 404 at the root", plant((p) => p === "/portal" ? notice({ status: 404 }) : undefined), /GET \/portal: status 404/],
    ["the notice for pages only, a 404 for client files", plant((p) => p.startsWith("/portal/assets/") ? notice({ status: 404 }) : undefined), /assets\/index-4f2a9c\.js: status 404/],
    ["the notice for the verb path only wrongly a 404", plant((p) => p.endsWith(".map") ? notice({ status: 404 }) : undefined), /document\.map: status 404/],
    ["the notice for a trace only wrongly a 404", plant((p) => p.startsWith("/portal/traces/") ? notice({ status: 404 }) : undefined), /traces\/0af765\w*: status 404/],
    ["plain text", plant((p) => isScreen(p) ? notice({ type: "text/plain" }) : undefined), /not text\/html/],
    ["JSON", plant((p) => isScreen(p) ? notice({ type: "application/json" }) : undefined), /not text\/html/],
    ["a body that does not say it", plant((p) => isScreen(p) ? notice({ body: "<p>Preview only.</p>" }) : undefined), /does not say "not in this release"/],
    ["a body that names no release", plant((p) => isScreen(p) ? notice({ body: "<p>The screens are not in this release.</p>" }) : undefined), /does not name the release/],
    ["a body that names only a version", plant((p) => isScreen(p) ? notice({ body: "<p>The screens are not in this release (0.1.0-next.1).</p>" }) : undefined), /does not name the release/],
    ["the old text", plant((p) => isScreen(p) ? notice({ body: `${NOTICE} The portal's client is not installed in this Worker.` }) : undefined), /old "client is not installed"/],
    ["an empty body", plant((p) => isScreen(p) ? notice({ body: "" }) : undefined), /does not say/],
  ];
  it.each(wrongScreens)("screens: %s is named", async (_name, ask, expected) => {
    const problems = await screens(ask);
    expect(problems.length, "a wrong answer passed the screens judge").toBeGreaterThan(0);
    expect(problems.join("\n")).toMatch(expected);
  });

  const json = (body: unknown, over: Partial<Seen> = {}): Seen => ({ status: 200, type: "application/json", body: JSON.stringify(body), etag: null, allow: null, ...over });
  const wrongFeed: ReadonlyArray<readonly [string, Ask, RegExp]> = [
    ["a blueprint that is a 404", plant((p) => p === "/_portal/v1/blueprint" ? json({ _tag: "NotFound" }, { status: 404, etag: `"${blueprint.digest}"` }) : undefined), /blueprint: status 404/],
    ["a blueprint with another etag", plant((p) => p === "/_portal/v1/blueprint" ? json(blueprint, { etag: '"other"' }) : undefined), /blueprint: etag/],
    ["a blueprint with no etag", plant((p) => p === "/_portal/v1/blueprint" ? json(blueprint) : undefined), /blueprint: etag null/],
    ["a blueprint missing a thing", plant((p) => { if (p !== "/_portal/v1/blueprint") return undefined; const [, ...rest] = things; return json({ ...blueprint, model: { things: Object.fromEntries(rest.map((t) => [t, {}])) } }, { etag: `"${blueprint.digest}"` }); }), /blueprint: its things/],
    ["a blueprint with an extra thing", plant((p) => p === "/_portal/v1/blueprint" ? json({ ...blueprint, model: { things: { ...blueprint.model.things, extra: {} } } }, { etag: `"${blueprint.digest}"` }) : undefined), /blueprint: its things/],
    ["a blueprint that is the notice", plant((p) => p === "/_portal/v1/blueprint" ? notice({ etag: `"${blueprint.digest}"` }) : undefined), /blueprint: status 501/],
    ["a snapshot that is the notice", plant((p) => p.startsWith("/_portal/v1/snapshot") ? notice() : undefined), /snapshot: status 501/],
    ["a snapshot as HTML", plant((p) => p.startsWith("/_portal/v1/snapshot") ? json({}, { type: "text/html" }) : undefined), /snapshot: content-type/],
    ["an unknown data path that is the notice", plant((p) => p === "/_portal/v1/no-such-thing" ? notice() : undefined), /an unknown data path: status 501/],
    ["an unknown data path that is a 200", plant((p) => p === "/_portal/v1/no-such-thing" ? json({ _tag: "NotFound" }) : undefined), /an unknown data path: status 200/],
    ["an unknown data path that is a 404 with no tag", plant((p) => p === "/_portal/v1/no-such-thing" ? json({}, { status: 404 }) : undefined), /not \{ _tag: "NotFound" \}/],
    ["a feed that throws", async (p, m) => { if (p.startsWith("/_portal/")) throw new Error("boom"); return correct(p, m); }, /threw/],
  ];
  it.each(wrongFeed)("feed: %s is named", async (_name, ask, expected) => {
    const problems = await feed(ask);
    expect(problems.length, "a wrong answer passed the feed judge").toBeGreaterThan(0);
    expect(problems.join("\n")).toMatch(expected);
  });

  const wrongMethods: ReadonlyArray<readonly [string, Ask, RegExp]> = [
    ["a POST to the screens that is the notice", plant((p, m) => m === "POST" && p === "/portal" ? notice() : undefined), /POST \/portal: status 501/],
    ["a POST to the data that is a 200", plant((p, m) => m === "POST" && p === "/_portal/v1/blueprint" ? json({}) : undefined), /POST \/_portal\/v1\/blueprint: status 200/],
    ["a 405 with no allow", plant((p, m) => m === "POST" ? notice({ status: 405 }) : undefined), /allow null/],
    ["a 405 allowing POST", plant((p, m) => m === "POST" ? notice({ status: 405, allow: "GET, HEAD, POST" }) : undefined), /allow GET, HEAD, POST/],
  ];
  it.each(wrongMethods)("methods: %s is named", async (_name, ask, expected) => {
    const problems = await methods(ask);
    expect(problems.length, "a wrong answer passed the methods judge").toBeGreaterThan(0);
    expect(problems.join("\n")).toMatch(expected);
  });
});

// ---- C: a project whose installed portal has no client, built and run with no licence ----

const KEY = "HEROUI_AUTH_TOKEN";
const unlicensed = (): NodeJS.ProcessEnv => { const env = { ...process.env }; delete env[KEY]; return env; };
const cli = join(repo, "packages/cli/src/main.ts");
const portalPackage = join(repo, "packages/portal");
const spare: string[] = [];
afterAll(() => { for (const dir of spare) rmSync(dir, { recursive: true, force: true }); });

/**
 * A project as a published install leaves it: its `@orthograph/portal` is a folder with the manifest (a real file, so the project resolves
 * the folder itself and not this repository's package) and the source, and no `dist/client`.
 */
const withoutClient = (root: string) => {
  const scope = join(root, "node_modules/@orthograph");
  const packages = readdirSync(scope).map((name) => [name, realpathSync(join(scope, name))] as const);
  unlinkSync(scope);
  mkdirSync(scope);
  for (const [name, target] of packages) if (name !== "portal") symlinkSync(target, join(scope, name));
  const folder = join(scope, "portal");
  mkdirSync(folder);
  cpSync(join(portalPackage, "package.json"), join(folder, "package.json"));
  for (const entry of readdirSync(portalPackage)) if (entry !== "package.json" && entry !== "dist") symlinkSync(join(portalPackage, entry), join(folder, entry));
  expect(existsSync(join(folder, "dist")), "the installed portal has no built client").toBe(false);
};
const git = (root: string, ...args: ReadonlyArray<string>) => {
  const r = spawnSync("git", ["-c", "user.name=g18", "-c", "user.email=g18@example.test", "-c", "commit.gpgsign=false", ...args], { cwd: root, encoding: "utf8" });
  expect(r.status, r.stderr).toBe(0);
};
const fresh = () => {
  const copy = copyOf(acme);
  writeFileSync(join(copy.root, ".gitignore"), "node_modules/\n.ortho/\n.wrangler/\n");
  withoutClient(copy.root);
  git(copy.root, "init", "-q", "-b", "main");
  git(copy.root, "add", "-A");
  git(copy.root, "commit", "-q", "-m", "fresh");
  return copy;
};

describe("47 C: a built and running project, with no client installed and no licence", () => {
  it("`ortho build` with the token unset exits 0 and ships no client", { timeout: 300_000 }, () => {
    const copy = fresh();
    try {
      const built = spawnSync(process.execPath, [cli, "build", "--root", copy.root], { cwd: copy.root, encoding: "utf8", env: unlicensed(), maxBuffer: 64 * 1024 * 1024 });
      const out = `${built.stdout}${built.stderr}`;
      expect(built.status, `ortho build with ${KEY} unset: ${out.slice(-1500)}`).toBe(0);
      const revision = /^built (\S+) sha256:[0-9a-f]{64}$/m.exec(built.stdout)?.[1];
      expect(revision, out).toBeDefined();
      const shipped = join(copy.root, ".ortho/artefacts", revision!, "portal");
      expect(existsSync(join(shipped, "index.html")), "no screens are in the revision").toBe(false);
    } finally { copy.remove(); }
  });

  it("the world answers the feed as today, and the screens say they are not in this release (over HTTP)", { timeout: 300_000 }, async () => {
    delete process.env[KEY]; // each test file runs in its own process: nothing outside this file sees the change
    const copy = fresh();
    const scope = Effect.runSync(Scope.make());
    try {
      const world = await Effect.runPromise(Effect.gen(function* () {
        return yield* Worlds.start({ root: copy.root, port: yield* Effect.promise(freePort), name: "g18-portal-no-screens" });
      }).pipe(Effect.onError(() => Scope.close(scope, Exit.void)), Scope.provide(scope)));
      const ask: Ask = async (path, method = "GET") => seenOf(await fetch(`${world.url}${path}`, { method }));
      expect(await feed(ask), "the feed, over HTTP").toEqual([]);
      expect(await methods(ask), "the rules of reading, over HTTP").toEqual([]);
      expect(await screens(ask), "the screens, over HTTP").toEqual([]);
    } finally {
      await Effect.runPromise(Scope.close(scope, Exit.void));
      copy.remove();
    }
  });
});

// ---- D: the licence ----

interface Manifest { readonly name: string; readonly private?: boolean; readonly dependencies?: Record<string, string>; readonly devDependencies?: Record<string, string>; readonly peerDependencies?: Record<string, string>; readonly optionalDependencies?: Record<string, string> }
const manifests = readdirSync(join(repo, "packages")).filter((d) => existsSync(join(repo, "packages", d, "package.json")))
  .map((dir) => ({ dir, manifest: JSON.parse(readFileSync(join(repo, "packages", dir, "package.json"), "utf8")) as Manifest }));
const FIELDS = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"] as const;
const needsPro = (m: Manifest) => FIELDS.some((f) => Object.keys(m[f] ?? {}).some((n) => n.startsWith("@heroui-pro/")));
/** The nx project names of the packages that declare the licensed package: found from the manifests, not from any task output. */
const licensed = manifests.filter((m) => needsPro(m.manifest)).map((m) => m.dir);
const published = manifests.filter((m) => m.manifest.private !== true);
/** A dependency that is a UI package: React, the portal's components, HeroUI. */
const UI = /^(react|react-dom|@orthograph\/portal-ui|@heroui|@heroui-pro)/;
const nx = join(repo, "node_modules/.bin/nx");

const buildGraph = (projects: ReadonlyArray<string>): ReadonlyArray<string> => {
  const parent = mkdtempSync(join(realpathSync(tmpdir()), "ortho-g18-8-"));
  spare.push(parent);
  const file = join(parent, "graph.json");
  const ran = spawnSync(nx, ["run-many", "-t", "build", "-p", projects.join(","), `--graph=${file}`], { cwd: repo, encoding: "utf8", env: { ...unlicensed(), NX_DAEMON: "false" }, maxBuffer: 64 * 1024 * 1024 });
  expect(ran.status, `${ran.stdout}${ran.stderr}`.slice(-1500)).toBe(0);
  return Object.keys((JSON.parse(readFileSync(file, "utf8")) as { tasks: { tasks: Record<string, unknown> } }).tasks.tasks);
};

describe("47 D: nothing a published package builds from needs the HeroUI Pro licence", () => {
  it("the oracle is real: portal-ui declares the licensed package, and the portal is among the published packages", () => {
    expect(licensed, "the packages that declare @heroui-pro/*").toContain("portal-ui");
    expect(published.map((m) => m.manifest.name)).toContain("@orthograph/portal");
    expect(published.map((m) => m.manifest.name)).toContain("orthograph");
  });

  it("no published package declares @heroui-pro/*: the screens' components (portal-ui) wait with the screens, so they are not published", () => {
    expect(published.map((m) => m.dir).filter((d) => licensed.includes(d)), "K44 call 2: a published package that needs the licence").toEqual([]);
  });

  it("the build tasks of every published package include no project that declares @heroui-pro/*", { timeout: 300_000 }, () => {
    const tasks = buildGraph(published.map((m) => m.dir));
    expect(tasks.length, "the graph has tasks").toBeGreaterThanOrEqual(published.length);
    const pulled = tasks.filter((t) => licensed.includes(t.split(":")[0]!));
    expect(pulled, "K44 call 2: building a package that ships needs no licence, so no `build` here may wait for a package that needs it").toEqual([]);
  });

  it("the published portal package ships no client, and no UI package is among what it depends on, peers or offers", () => {
    const portal = published.find((m) => m.manifest.name === "@orthograph/portal")!.manifest;
    for (const field of ["dependencies", "peerDependencies", "optionalDependencies"] as const) {
      const names = Object.keys(portal[field] ?? {});
      expect(names.filter((n) => UI.test(n)), `portal's ${field}`).toEqual([]);
    }
    const packed = spawnSync("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"], { cwd: portalPackage, encoding: "utf8", env: { ...process.env, npm_config_update_notifier: "false" } });
    expect(packed.status, packed.stderr).toBe(0);
    const files = (JSON.parse(packed.stdout) as Array<{ files: Array<{ path: string }> }>)[0]!.files.map((f) => f.path);
    expect(files.filter((f) => f.startsWith("dist/client")), "the tarball's client files").toEqual([]);
    expect(files.filter((f) => /\.(tsx|css|html)$/.test(f) || f.startsWith("src/")), "the tarball's page sources").toEqual([]);
  });

  describe("controls: the graph judge sees a licensed task, and the manifest judge a UI dependency", () => {
    it("the graph of portal-ui's own build holds portal-ui, and the judge's filter names it", { timeout: 300_000 }, () => {
      const tasks = buildGraph(["portal-ui"]);
      expect(tasks.filter((t) => licensed.includes(t.split(":")[0]!))).toEqual(["portal-ui:build"]);
    });
    it("a manifest with a UI dependency is named by the same pattern", () => {
      for (const planted of ["react", "react-dom", "@orthograph/portal-ui", "@heroui/react", "@heroui-pro/react"]) {
        expect(UI.test(planted), planted).toBe(true);
      }
      expect(UI.test("effect")).toBe(false);
    });
  });
});
