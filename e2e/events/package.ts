// The fixture bank, built as a package and installed into a project copy's node_modules: `e2e/fixtures/events/bank`
// holds `package.json` and `source/` (an adapter with two events and a signing door, hand-written, no real vendor).
// Built as e2e/m1/packages.ts builds its fixtures, but lighter: esbuild to dist/ (the compiler and the server load
// JavaScript), and tsc's declarations best effort, because until M5.03 the framework has no `Blueprint.door` and the
// sources cannot type-check against it (as m1's builder also allows before M1.05).
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll, expect } from "vitest";
import { repo } from "../layer1/support.ts";

const source = join(repo, "e2e/fixtures/events/bank");
const work = mkdtempSync(join(tmpdir(), "ortho-events-bank-"));
afterAll(() => rmSync(work, { recursive: true, force: true }));

const filesIn = (dir: string): ReadonlyArray<string> =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? filesIn(join(dir, e.name)) : e.name.endsWith(".ts") ? [join(dir, e.name)] : []));
const link = (from: string, to: string) => {
  mkdirSync(dirname(to), { recursive: true });
  symlinkSync(from, to);
};

let built: string | undefined;
/** Build the bank once per test file: its folder, ready to copy into a node_modules. */
const build = (): string => {
  if (built) return built;
  const dir = join(work, "bank");
  cpSync(source, dir, { recursive: true });
  link(join(repo, "packages/orthograph"), join(dir, "node_modules/orthograph"));
  link(join(repo, "packages/language-effect"), join(dir, "node_modules/@orthograph/language-effect"));
  link(join(repo, "node_modules/effect"), join(dir, "node_modules/effect"));
  const esbuild = join(repo, "packages/prove/node_modules/.bin/esbuild");
  const run = spawnSync(esbuild, [...filesIn(join(dir, "source")), "--format=esm", "--platform=neutral", `--outbase=${join(dir, "source")}`, `--outdir=${join(dir, "dist")}`, "--log-level=warning"], { cwd: dir, encoding: "utf8" });
  expect(run.status, `esbuild on the bank:\n${run.stdout}${run.stderr}`).toBe(0);
  writeFileSync(join(dir, "tsconfig.json"), JSON.stringify({ extends: join(repo, "tsconfig.base.json"), compilerOptions: { noEmit: false, declaration: true, emitDeclarationOnly: true, rootDir: "source", outDir: "dist", types: ["node"] }, include: ["source/**/*.ts"] }));
  spawnSync(join(repo, "node_modules/.bin/tsc"), ["--pretty", "false", "-p", join(dir, "tsconfig.json")], { cwd: dir, encoding: "utf8", timeout: 180_000 });
  expect(existsSync(join(dir, "dist/adapter.js")), "the bank was not built").toBe(true);
  rmSync(join(dir, "node_modules"), { recursive: true, force: true });
  return (built = dir);
};

/** Install the bank the way a package manager would: its files in `<root>/node_modules/@fixture/bank`, pinned in package.json. */
export const installBank = (root: string) => {
  const target = join(root, "node_modules/@fixture/bank");
  rmSync(target, { recursive: true, force: true });
  mkdirSync(dirname(target), { recursive: true });
  cpSync(build(), target, { recursive: true });
  const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { dependencies?: Record<string, string> };
  manifest.dependencies = { ...manifest.dependencies, "@fixture/bank": "1.0.0" };
  writeFileSync(join(root, "package.json"), JSON.stringify(manifest, null, 2) + "\n");
};
