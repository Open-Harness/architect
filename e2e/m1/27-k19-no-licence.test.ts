// Check 27 (K19, the portal ships prebuilt): a generated project builds and runs locally with no HeroUI licence. `HEROUI_AUTH_TOKEN` is
// unset for the child processes and the world (the check never reads it: it deletes the name from the environment it hands on). Three things:
//   1. `ortho build` of a fresh project exits 0, and the Worker bundle (main.js and its source map) holds no React and no HeroUI;
//   2. the revision ships the portal's prebuilt client as static assets: `.ortho/artefacts/<revision>/portal/` holds the files of
//      `packages/portal/dist/client`, byte for byte (K19: "built once, in this repository"; the Worker serves them at `/portal`);
//   3. the project runs locally on workerd: `/portal` is only a shell with a script (no `data-portal` hooks in the response), `/_portal/v1/*`
//      is the data, and a browser opening `/portal` draws every thing from it.
// What a builder owes: `packages/portal` builds `dist/client` (HTML, JS, CSS), `ortho build` copies it to `portal/` beside `main.js`, and the
// Worker serves it at `/portal` with the data API at `/_portal/v1/*` (Workers static assets, single-page fallback for `/portal/*`).
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Effect, Exit, Scope } from "effect";
import { Worlds } from "@orthograph/prove";
import { afterAll, describe, expect, it } from "vitest";
import { ServedPortals } from "../served-portal/service.ts";
import { freePort } from "./clients.ts";
import { acme, copyOf, repo } from "./support.ts";

const KEY = "HEROUI_AUTH_TOKEN";
/** The environment a person without the licence has: everything but the token. */
const unlicensed = (): NodeJS.ProcessEnv => { const env = { ...process.env }; delete env[KEY]; return env; };
const cli = join(repo, "packages/cli/src/main.ts");
const dist = join(repo, "packages/portal/dist/client");

afterAll(async () => { await ServedPortals.closeAll(); });

const git = (root: string, ...args: ReadonlyArray<string>) => {
  const r = spawnSync("git", ["-c", "user.name=k19", "-c", "user.email=k19@example.test", "-c", "commit.gpgsign=false", ...args], { cwd: root, encoding: "utf8" });
  expect(r.status, r.stderr).toBe(0);
};
/** A fresh project: a copy of acme under git, as `ortho build` needs it (the revision is the commit). */
const fresh = () => {
  const copy = copyOf(acme);
  writeFileSync(join(copy.root, ".gitignore"), "node_modules/\n.ortho/\n.wrangler/\n");
  git(copy.root, "init", "-q", "-b", "main");
  git(copy.root, "add", "-A");
  git(copy.root, "commit", "-q", "-m", "fresh");
  return copy;
};
const build = (root: string) => {
  const built = spawnSync(process.execPath, [cli, "build", "--root", root], { cwd: root, encoding: "utf8", env: unlicensed(), maxBuffer: 64 * 1024 * 1024 });
  const out = `${built.stdout}${built.stderr}`;
  expect(built.status, `ortho build with ${KEY} unset: ${out.slice(-2000)}`).toBe(0);
  const match = /^built (\S+) sha256:([0-9a-f]{64})$/m.exec(built.stdout);
  expect(match, out).not.toBeNull();
  return join(root, ".ortho/artefacts", match![1]!);
};
const filesUnder = (dir: string): ReadonlyArray<string> => existsSync(dir)
  ? readdirSync(dir, { recursive: true, withFileTypes: true }).filter((e) => e.isFile()).map((e) => join(e.parentPath, e.name).slice(dir.length + 1)).sort()
  : [];
const sha = (path: string) => createHash("sha256").update(readFileSync(path)).digest("hex");

/** What a Worker bundle that carries React or HeroUI shows: React's element marker, its internals, DOM server, the package scopes. */
const UI_IN_BUNDLE = [/react\.(transitional\.)?element/, /__SECRET_INTERNALS_DO_NOT_USE/, /react-dom/, /@heroui/, /heroui-pro/i];
const UI_IN_SOURCES = [/node_modules\/(\.pnpm\/[^/]*\/node_modules\/)?react(-dom)?\//, /portal-ui/, /@heroui/];

describe("27 K19: a generated project builds with no HeroUI licence", () => {
  it("`ortho build` of a fresh project, with the token unset, exits 0, and the Worker bundle holds no React and no HeroUI", { timeout: 300_000 }, () => {
    const copy = fresh();
    try {
      const artefacts = build(copy.root);
      const main = readFileSync(join(artefacts, "main.js"), "utf8");
      for (const marker of UI_IN_BUNDLE) expect(marker.test(main), `K19: main.js carries ${marker}`).toBe(false);
      const sources = (JSON.parse(readFileSync(join(artefacts, "main.js.map"), "utf8")) as { sources: ReadonlyArray<string> }).sources;
      expect(sources.length, "the source map lists what was bundled").toBeGreaterThan(10);
      for (const marker of UI_IN_SOURCES) expect(sources.filter((s) => marker.test(s)), `K19: the bundle's sources match ${marker}`).toEqual([]);
    } finally { copy.remove(); }
  });

  it("the revision ships the portal's prebuilt client as static assets, byte for byte what this repository built", { timeout: 300_000 }, () => {
    expect(existsSync(join(dist, "index.html")), `K19: ${dist}/index.html is missing: \`@orthograph/portal\` builds its client (HTML, JS, CSS) once, here, with the licence`).toBe(true);
    const copy = fresh();
    try {
      const shipped = join(build(copy.root), "portal");
      const built = filesUnder(dist);
      expect(built.some((f) => f.endsWith(".js")), "the built client has script").toBe(true);
      expect(filesUnder(shipped), `K19: ${shipped} holds the client's files`).toEqual(built);
      for (const file of built) expect(sha(join(shipped, file)), file).toBe(sha(join(dist, file)));
    } finally { copy.remove(); }
  });
});

describe("27 K19: the project runs locally with no licence, and the portal is drawn in a browser", () => {
  it("`/portal` is a shell with a script, `/_portal/v1/*` is the data, and a browser draws every thing from it", { timeout: 300_000 }, async () => {
    delete process.env[KEY]; // each test file runs in its own process: nothing outside this file sees the change
    const copy = copyOf(acme);
    const scope = Effect.runSync(Scope.make());
    try {
      const world = await Effect.runPromise(Effect.gen(function* () {
        return yield* Worlds.start({ root: copy.root, port: yield* Effect.promise(freePort), name: "k19-no-licence" });
      }).pipe(Effect.onError(() => Scope.close(scope, Exit.void)), Scope.provide(scope)));
      const things = Object.keys((JSON.parse(readFileSync(join(acme, "generated/portal/blueprint.json"), "utf8")) as { model: { things: object } }).model.things).sort();
      expect(things.length).toBeGreaterThan(1);

      const shell = await fetch(`${world.url}/portal`);
      const html = await shell.text();
      expect(shell.status).toBe(200);
      const script = /<script[^>]*type="module"[^>]*src="([^"]+)"/.exec(html)?.[1];
      expect(script, "K19: /portal is the built client's shell, a page with a module script, not a page the Worker drew").toBeDefined();
      expect(html, "K19: the shell holds none of the page: the pages are drawn in the browser from /_portal/v1/*").not.toContain('data-portal="thing-card"');
      const asset = await fetch(new URL(script!, `${world.url}/portal/`));
      expect(asset.status, `the shell's script ${script}`).toBe(200);
      expect(asset.headers.get("content-type") ?? "").toMatch(/javascript/);

      const data = await fetch(`${world.url}/_portal/v1/blueprint`);
      expect(data.status).toBe(200);
      expect(Object.keys(((await data.json()) as { model: { things: object } }).model.things).sort(), "the data is the project's blueprint").toEqual(things);

      const portal = await ServedPortals.open({ url: world.url });
      const page = await portal.page("/portal");
      expect(page.status).toBe(200);
      expect([...page.html.matchAll(/data-portal="thing-card"[^>]*data-thing="([^"]+)"|data-thing="([^"]+)"[^>]*data-portal="thing-card"/g)].map((m) => m[1] ?? m[2]).sort(), "a card for each thing, drawn in the browser").toEqual(things);
      expect(page.fetched.map((f) => f.path).some((p) => p.startsWith("/_portal/v1/")), "from the data API").toBe(true);
    } finally {
      await Effect.runPromise(Scope.close(scope, Exit.void));
      copy.remove();
    }
  });
});
