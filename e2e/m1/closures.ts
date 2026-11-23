// The import rule of M1-plugins section 8, measured on the real import closure: esbuild's metafile lists every file a
// bundle actually pulled in, so nothing here depends on tree shaking removing what was imported.
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { expect } from "vitest";
import { repo } from "../layer1/support.ts";

type Import = { path: string; external?: boolean };
export type Meta = { inputs: Record<string, { imports: ReadonlyArray<Import> }>; outputs: Record<string, { imports: ReadonlyArray<Import> }> };

/** Bundle `entry` (a path in the project) for a browser-like host and read what went in. */
export const bundle = (root: string, entry: string, name: string): Meta => {
  const output = join(root, ".ortho/closures", name);
  mkdirSync(dirname(output), { recursive: true });
  const result = spawnSync(join(repo, "packages/prove/node_modules/.bin/esbuild"), [entry, "--bundle", "--format=esm", "--platform=browser",
    "--target=es2024", "--external:node:*", "--external:cloudflare:*", `--outfile=${output}.js`, `--metafile=${output}.json`, "--log-level=warning"],
  { cwd: root, encoding: "utf8", timeout: 180_000 });
  expect(result.status, result.stdout + result.stderr).toBe(0);
  return JSON.parse(readFileSync(`${output}.json`, "utf8")) as Meta;
};

/** The files of `pkg` (relative to the installed package) that a bundle took in. */
export const filesOf = (root: string, meta: Meta, pkg = "@fixture/echo"): ReadonlyArray<string> => {
  // macOS reaches the temp folder through a symlink (/var is /private/var): compare real paths only.
  const base = realpathSync(root);
  const installed = realpathSync(join(base, "node_modules", pkg));
  return Object.keys(meta.inputs).map((name) => resolve(base, name)).filter((path) => path.startsWith(installed + "/")).map((path) => relative(installed, path)).sort();
};

/**
 * What a closure must not hold. A client closure (api, sdk) holds a plugin's descriptor and its `blueprint/*` entries and
 * nothing else of it, no Node builtin and no build-only module; the worker holds no `.node.js` or `.browser.js` entry.
 */
export const violations = (root: string, meta: Meta, tier: "client" | "worker", pkg = "@fixture/echo"): ReadonlyArray<string> => {
  const bad: Array<string> = [];
  for (const local of filesOf(root, meta, pkg)) {
    const pure = /^dist\/(?:feature|adapter|projection)\.js$/.test(local) || local.startsWith("dist/blueprint/");
    if (tier === "client" ? !pure : /\.(?:node|browser)\.js$/.test(local)) bad.push(`${pkg}:${local}`);
  }
  for (const name of Object.keys(meta.inputs)) if (/[/\\](compiler|generators)[/\\](src|dist)[/\\]/.test(resolve(root, name))) bad.push("build-only module");
  if (tier === "client") {
    for (const part of [...Object.values(meta.inputs), ...Object.values(meta.outputs)]) for (const imported of part.imports) if (imported.path.startsWith("node:")) bad.push(imported.path);
  }
  return [...new Set(bad)].sort();
};

/**
 * Type-check a call of the generated SDK in a browser-like program (no Node types), including a wrong payload that must
 * not compile, and read back which files the program held: `forbidden` must be none of them.
 */
export const typecheckSdk = (root: string, call: { readonly access: string; readonly payload: string; readonly wrong: string }, forbidden: ReadonlyArray<RegExp> = []) => {
  const dir = join(root, ".ortho/browser-types");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "main.ts"), [
    'import { Effect } from "effect";',
    'import * as Sdk from "../../generated/sdk/src/index.ts";',
    `const request: Effect.Effect<unknown, unknown> = Sdk.${call.access}(${call.payload}).pipe(Effect.provide(Sdk.layer("http://127.0.0.1:1")));`,
    "void request;",
    "// @ts-expect-error the payload does not match the declaration",
    `Sdk.${call.access}(${call.wrong});`,
    "",
  ].join("\n"));
  writeFileSync(join(dir, "tsconfig.json"), JSON.stringify({ extends: join(root, "tsconfig.json"), compilerOptions: {
    types: [], lib: ["es2024", "dom", "dom.iterable"], noEmit: true,
  }, include: ["main.ts"] }));
  const tsc = join(root, "node_modules/.bin/tsc");
  const checked = spawnSync(tsc, ["-p", join(dir, "tsconfig.json")], { cwd: root, encoding: "utf8", timeout: 180_000 });
  expect(checked.status, checked.stdout + checked.stderr).toBe(0);
  const files = spawnSync(tsc, ["-p", join(dir, "tsconfig.json"), "--listFilesOnly"], { cwd: root, encoding: "utf8", timeout: 180_000 });
  expect(files.status, files.stdout + files.stderr).toBe(0);
  for (const pattern of forbidden) expect(files.stdout).not.toMatch(pattern);
};
