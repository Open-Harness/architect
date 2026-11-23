// Check 26 (K19, the portal ships prebuilt): the line between the server half and the client half. Nothing reachable from
// `@orthograph/portal/server`, or from any generated code, may import `react`, `@orthograph/portal-ui` or HeroUI Pro. Three things are judged:
//   1. the graph walker itself, on planted in-memory graphs (a control: it passes today);
//   2. the real import graph: the server entry's, and every generated file's;
//   3. the lint rule a builder writes: `ortho/no-ui-in-worker`, tried on a planted breach and its expected diagnostics: each names the
//      module in quotes ('react'), and says K19.
// What a builder owes (K19, "The decision"): `packages/portal/package.json` exports `./server` (the data API for `/_portal/v1/*`, no
// React); the generated portal entry imports only that; `.oxlintrc.json` turns the rule on for `generated/` folders and for the server
// half of `packages/portal`. The pieces of the licensed package's name are joined here: check 15 allows the whole name only in portal-ui.
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { breaches, entryOf, importsOf, isUi, type Files, type Workspace } from "./import-graph.ts";
import { repo } from "./support.ts";

const PRO = "@heroui" + "-pro";
const RULE = "no-ui-in-worker";

const memory = (tree: Record<string, string>): Files => ({ read: (path) => tree[path] });
const disk: Files = { read: (path) => (existsSync(path) ? readFileSync(path, "utf8") : undefined) };
const workspace = (): Workspace => Object.fromEntries(readdirSync(join(repo, "packages")).flatMap((name) => {
  const manifest = join(repo, "packages", name, "package.json");
  return existsSync(manifest) ? [[(JSON.parse(readFileSync(manifest, "utf8")) as { name: string }).name, join(repo, "packages", name)] as const] : [];
}));
const rel = (path: string) => relative(repo, path);
const walkTs = (dir: string): ReadonlyArray<string> => existsSync(dir)
  ? readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.name === "node_modules" ? [] : e.isDirectory() ? walkTs(join(dir, e.name)) : /\.tsx?$/.test(e.name) ? [join(dir, e.name)] : [])
  : [];

describe("26 control: the walker sees every way a Worker can reach the UI, and only those", () => {
  const ws: Workspace = { "@orthograph/portal": "/w/portal", "@orthograph/portal-ui": "/w/ui", "@orthograph/lib": "/w/lib" };
  const tree = (extra: Record<string, string>) => memory({
    "/w/portal/package.json": JSON.stringify({ name: "@orthograph/portal", imports: { "#modules/*.js": "./src/modules/*.ts" }, exports: { "./server": "./src/server.ts" } }),
    "/w/lib/package.json": JSON.stringify({ name: "@orthograph/lib", exports: { ".": "./src/index.ts" } }),
    "/w/lib/src/index.ts": 'export { clean } from "effect";',
    ...extra,
  });
  const from = (files: Files, root = "/w/portal/src/server.ts") => breaches(files, ws, [root]);

  it("passes a graph of Effect and project code, through every kind of import that is not the UI", () => {
    const files = tree({ "/w/portal/src/server.ts": 'import { Effect } from "effect";\nimport "./side.ts";\nimport type { T } from "#modules/a.js";\nimport { clean } from "@orthograph/lib";\nimport blueprint from "./b.json" with { type: "json" };\nexport { T };', "/w/portal/src/side.ts": "export {};", "/w/portal/src/modules/a.ts": "export type T = 1;" });
    expect(from(files)).toEqual([]);
  });

  it.each([
    ["a direct import", 'import React from "react";', "react"],
    ["a subpath", 'import { renderToString } from "react-dom/server";', "react-dom/server"],
    ["a type-only import", 'import type { ReactNode } from "react";', "react"],
    ["a re-export", `export { Chart } from "${PRO}/chart";`, `${PRO}/chart`],
    ["a dynamic import", 'export const lazy = () => import("@orthograph/portal-ui/shell");', "@orthograph/portal-ui/shell"],
    ["a require", 'const ui = require("react");', "react"],
    ["a star re-export", 'export * from "react";', "react"],
    ["a type-only named import", 'import type { ReactNode, FC } from "react";', "react"],
    ["a type-only re-export", 'export type { FC } from "react";', "react"],
    ["react-dom, which is not react", 'import "react-dom";', "react-dom"],
    ["the OSS HeroUI", 'import { Button } from "@heroui/react";', "@heroui/react"],
  ])("finds %s", (_, line, specifier) => {
    expect(from(tree({ "/w/portal/src/server.ts": line })).map((b) => b.specifier)).toEqual([specifier]);
  });

  it("finds one behind a relative file, a `#` alias and a workspace package, and says the chain", () => {
    const files = tree({
      "/w/portal/src/server.ts": 'import "./a.ts";',
      "/w/portal/src/a.ts": 'import "#modules/b.js";',
      "/w/portal/src/modules/b.ts": 'import "@orthograph/lib";',
      "/w/lib/src/index.ts": 'import { Shell } from "@orthograph/portal-ui";',
    });
    expect(from(files)).toEqual([{ specifier: "@orthograph/portal-ui", importer: "/w/lib/src/index.ts", via: ["/w/portal/src/server.ts", "/w/portal/src/a.ts", "/w/portal/src/modules/b.ts", "/w/lib/src/index.ts"] }]);
  });

  it("ignores a name inside a comment, follows a cycle once, and does not mistake `reactor` for react", () => {
    const files = tree({ "/w/portal/src/server.ts": '// import React from "react";\n/* import "react-dom"; */\nimport "./a.ts";\nimport "reactor";', "/w/portal/src/a.ts": 'import "./server.ts";' });
    expect(from(files)).toEqual([]);
    expect([...importsOf('import x from "a"; export * from "b"; import("c"); require("d"); import "e";')].sort()).toEqual(["a", "b", "c", "d", "e"]);
    expect(isUi("reactor")).toBe(false);
  });
});

describe("26 K19: nothing a Worker bundles reaches the UI", () => {
  const portal = join(repo, "packages/portal");

  it("`@orthograph/portal` exports `./server`, and nothing reachable from it imports react, portal-ui or HeroUI", () => {
    const entry = entryOf(disk, portal, "./server");
    expect(entry, "K19: packages/portal/package.json exports no `./server`: the portal's server half (the data API for /_portal/v1/*) is its own entry").toBeDefined();
    const found = breaches(disk, workspace(), [entry!], rel);
    expect(found.map((b) => `${b.specifier} from ${b.via.join(" > ")}`), "K19: the server half reaches the UI").toEqual([]);
  });

  it("nothing reachable from any generated file of acme or Plugged In imports react, portal-ui or HeroUI", () => {
    const roots = ["acme", "plugged-in"].flatMap((name) => walkTs(join(repo, "examples", name, "generated")));
    expect(roots.length, "the generated files").toBeGreaterThan(50);
    const found = breaches(disk, workspace(), roots, rel);
    expect(found.map((b) => `${b.specifier} from ${b.via.join(" > ")}`), "K19: generated code reaches the UI").toEqual([]);
  });

  it("the generated portal entry imports the portal's server half and nothing else of the portal", () => {
    for (const name of ["acme", "plugged-in"]) {
      const main = join(repo, "examples", name, "generated/portal/main.ts");
      expect(existsSync(main), `${name}'s generated portal entry`).toBe(true);
      const portalImports = importsOf(readFileSync(main, "utf8")).filter((s) => s === "@orthograph/portal" || s.startsWith("@orthograph/portal/"));
      expect(portalImports, `K19: ${name}'s generated/portal/main.ts imports the whole portal package`).toEqual(["@orthograph/portal/server"]);
    }
  });
});

// ---- the lint rule a builder writes ----

const configWithFixtures = (): string => {
  const config = JSON.parse(readFileSync(join(repo, ".oxlintrc.json"), "utf8")) as { ignorePatterns: Array<string>; jsPlugins: Array<string> };
  config.ignorePatterns = config.ignorePatterns.filter((p) => !p.includes("fixtures"));
  config.jsPlugins = config.jsPlugins.map((p) => (p.startsWith(".") ? join(repo, p) : p));
  mkdirSync(join(repo, "tmp"), { recursive: true });
  const path = join(repo, "tmp", "oxlintrc.k19.json");
  writeFileSync(path, JSON.stringify(config));
  return path;
};
/** The diagnostics of `ortho(no-ui-in-worker)` that oxlint prints for a file, one per line (`--format github`). */
const diagnostics = (file: string): { readonly exit: number | null; readonly lines: ReadonlyArray<string>; readonly output: string } => {
  const run = spawnSync(join(repo, "node_modules/.bin/oxlint"), ["-c", configWithFixtures(), "--no-ignore", "--format", "github", file], { cwd: repo, encoding: "utf8" });
  const output = `${run.stdout}${run.stderr}`;
  return { exit: run.status, lines: output.split("\n").filter((l) => l.includes(`ortho(${RULE})`)), output };
};

const BREACH = [
  'import React from "react";',
  'import { renderToString } from "react-dom/server";',
  'export * from "react";',
  'import type { ReactNode } from "react";',
  'import { Shell } from "@orthograph/portal-ui";',
  `import { Button } from "${PRO}/react";`,
  `export { Chart } from "${PRO}/react/chart";`,
  'export type Node = import("react").ReactNode;',
  'export const lazy = () => import("@orthograph/portal-ui/shell");',
  "export const planted = [React, renderToString, Shell, Button];",
].join("\n");
/** What the rule must say for each line of BREACH: K19, and the name it found. */
const EXPECTED = ["react", "react-dom/server", "react", "react", "@orthograph/portal-ui", `${PRO}/react`, `${PRO}/react/chart`, "react", "@orthograph/portal-ui/shell"];

describe("26 K19: the lint rule `ortho/no-ui-in-worker`", () => {
  const plant = (file: string, text: string, run: () => void) => {
    mkdirSync(dirname(join(repo, file)), { recursive: true });
    writeFileSync(join(repo, file), text);
    try { run(); } finally { rmSync(join(repo, file), { force: true }); }
  };

  it("reports each import of the UI in a generated file, naming K19 and the module, and reports a clean file as clean", { timeout: 120_000 }, () => {
    plant("tmp/lint-k19/generated/portal/breach.ts", `${BREACH}\n`, () => {
      const { lines, output } = diagnostics("tmp/lint-k19/generated/portal/breach.ts");
      expect(lines, `K19: the rule is not registered or not on for generated code; oxlint said:\n${output.slice(0, 600)}`).toHaveLength(EXPECTED.length);
      for (const [i, name] of EXPECTED.entries()) {
        expect(lines[i], `diagnostic ${i + 1} names the module, quoted`).toMatch(new RegExp(`['"\`]${name.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}['"\`]`));
        expect(lines[i], `diagnostic ${i + 1} says why`).toContain("K19");
      }
    });
    plant("tmp/lint-k19/generated/portal/clean.ts", 'import { Effect } from "effect";\nimport { PortalServer } from "@orthograph/portal/server";\nimport blueprint from "./blueprint.json" with { type: "json" };\nexport const ok = [Effect, PortalServer, blueprint];\n', () => {
      const { lines, output } = diagnostics("tmp/lint-k19/generated/portal/clean.ts");
      expect(lines, output.slice(0, 600)).toEqual([]);
    });
  });

  it("is on for the portal's server half too: a planted copy of the server entry with a React import is reported, the entry itself is clean", { timeout: 120_000 }, () => {
    const entry = entryOf(disk, join(repo, "packages/portal"), "./server");
    expect(entry, "K19: packages/portal/package.json exports no `./server`").toBeDefined();
    expect(diagnostics(rel(entry!)).lines, "the server entry as it is").toEqual([]);
    const planted = join(dirname(entry!), "planted-k19-breach.ts");
    try {
      copyFileSync(entry!, planted);
      writeFileSync(planted, `${readFileSync(planted, "utf8")}\n${BREACH}\n`);
      const { lines, output } = diagnostics(rel(planted));
      expect(lines, `K19: the rule is not on for the portal's server half; oxlint said:\n${output.slice(0, 600)}`).toHaveLength(EXPECTED.length);
    } finally { rmSync(planted, { force: true }); }
  });

  it("is off for the client half: portal-ui and the portal's own client import React freely", { timeout: 120_000 }, () => {
    for (const file of walkTs(join(repo, "packages/portal-ui/src")).slice(0, 3)) expect(diagnostics(rel(file)).lines, rel(file)).toEqual([]);
  });
});
