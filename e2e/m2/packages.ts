// Fixture plugin packages, built for real: tsc declaration emit, esbuild to dist/, `npm pack --offline`, the archive
// extracted into a project copy's node_modules. No registry and nothing faked. Each package is built once per test file
// (kept in a folder removed after the file) and installed as often as a test needs.
//
// A fixture lives in e2e/fixtures/m2/<kind>/{package.json,source/**,variants/<name>/**}. A variant is an overlay copied
// over source/, plus an optional REMOVE file listing source-relative paths to delete.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { afterAll, expect } from "vitest";
import { acme, repo } from "../layer1/support.ts";

export const fixtures = join(repo, "e2e/fixtures/m2");

export interface Built {
  readonly kind: string;
  readonly name: string;
  readonly version: string;
  readonly variant: string | undefined;
  readonly archive: string;
  readonly sha256: string;
  /** The files `npm pack` put in the archive (paths inside the package). */
  readonly packed: ReadonlyArray<string>;
  readonly sources: ReadonlyArray<string>;
}

const buildRoot = mkdtempSync(join(tmpdir(), "ortho-m2-build-"));
afterAll(() => rmSync(buildRoot, { recursive: true, force: true }));

const tool = (command: string, args: ReadonlyArray<string>, cwd: string) => {
  const result = spawnSync(command, args, { cwd, encoding: "utf8", timeout: 180_000, maxBuffer: 16 * 1024 * 1024 });
  expect(result.status, `${command} ${args.join(" ")}:\n${result.stdout}\n${result.stderr}`).toBe(0);
  return result.stdout;
};
const sourceFiles = (dir: string): ReadonlyArray<string> => readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
  entry.isDirectory() ? sourceFiles(join(dir, entry.name)) : entry.name.endsWith(".ts") ? [join(dir, entry.name)] : []);
const link = (from: string, to: string) => { mkdirSync(dirname(to), { recursive: true }); symlinkSync(from, to); };

/** Has the framework got `Blueprint.feature` yet (M1.05)? Until it has, a fixture's own type errors about the missing surface are expected. */
const frameworkHasDescriptors = (() => {
  let known: boolean | undefined;
  return () => known ??= spawnSync(process.execPath, ["--input-type=module", "-e",
    "import('orthograph').then((m) => process.exit(typeof m.Blueprint.feature === 'function' ? 0 : 1)).catch(() => process.exit(2))"],
  { cwd: acme, encoding: "utf8", timeout: 60_000 }).status === 0;
})();

// What tsc says is wrong with the fixture's own sources. Before M1.05 the framework does not export the surface
// M1-plugins pins (Blueprint.feature, choice, Mount ...), so a source file that uses it cannot type-check and every
// complaint about such a file is expected; a file that does not use it is checked strictly, always. After M1.05 every
// complaint counts.
const NEW_SURFACE = /\bMount\b|Blueprint\.(?:feature|adapter|projection|choice|need|call|use)\b/;
const typecheck = (work: string) => {
  const result = spawnSync(join(repo, "node_modules/.bin/tsc"), ["--pretty", "false", "-p", join(work, "tsconfig.json")], { cwd: work, encoding: "utf8", timeout: 180_000, maxBuffer: 16 * 1024 * 1024 });
  // `--pretty false`: with FORCE_COLOR (CI) tsc colours "error" and "TS" apart and no line matches. And tsc that dies without an error line is not a clean compile.
  const errors = `${result.stdout}${result.stderr}`.split("\n").filter((line) => /error TS\d+:/.test(line));
  if (result.status !== 0 && errors.length === 0) errors.push(`tsc exited ${String(result.status)} with no error line: ${result.stdout}${result.stderr}`);
  const usesSurface = (line: string) => {
    const file = /source\/([^(]+)\(/.exec(line)?.[1];
    return file !== undefined && existsSync(join(work, "source", file)) && NEW_SURFACE.test(readFileSync(join(work, "source", file), "utf8"));
  };
  const unexpected = frameworkHasDescriptors() ? errors : errors.filter((line) => !usesSurface(line));
  expect(unexpected, `tsc on ${work}:\n${result.stdout}${result.stderr}`).toEqual([]);
  expect(existsSync(join(work, "dist")), "tsc emitted no declarations").toBe(true);
};

/** Build one fixture package (once), pack it, and say where the archive is. */
export const build = (kind: string, options: { readonly variant?: string; readonly version?: string } = {}): Built => {
  const { variant, version = "1.0.0" } = options;
  const key = `${kind}-${variant ?? "base"}-${version}`;
  const cached = built.get(key);
  if (cached) return cached;
  const work = join(buildRoot, "work", key);
  rmSync(work, { recursive: true, force: true });
  cpSync(join(fixtures, kind), work, { recursive: true });
  const overlay = variant ? join(work, "variants", variant) : undefined;
  if (overlay) {
    expect(existsSync(overlay), `no variant ${variant} of ${kind}`).toBe(true);
    cpSync(overlay, join(work, "source"), { recursive: true });
    rmSync(join(work, "source/REMOVE"), { force: true });
    const removal = join(overlay, "REMOVE");
    if (existsSync(removal)) for (const path of readFileSync(removal, "utf8").split("\n").filter(Boolean)) rmSync(join(work, "source", path));
  }
  rmSync(join(work, "variants"), { recursive: true, force: true });

  const manifest = JSON.parse(readFileSync(join(work, "package.json"), "utf8")) as { name: string; version: string };
  expect(manifest.name).toMatch(/^@fixture\/[a-z][a-z0-9-]*$/);
  manifest.version = version;
  writeFileSync(join(work, "package.json"), JSON.stringify(manifest, null, 2) + "\n");

  // What the sources compile against: the repository's own packages, and any fixture they sit beside (greet needs echo).
  link(join(repo, "packages/orthograph"), join(work, "node_modules/orthograph"));
  link(join(repo, "packages/language-effect"), join(work, "node_modules/@orthograph/language-effect"));
  link(join(repo, "node_modules/effect"), join(work, "node_modules/effect"));
  link(join(repo, "node_modules/@types"), join(work, "node_modules/@types"));
  const peers = Object.keys((JSON.parse(readFileSync(join(work, "package.json"), "utf8")) as { peerDependencies?: Record<string, string> }).peerDependencies ?? {});
  for (const peer of peers.filter((p) => p.startsWith("@fixture/"))) {
    const dependency = build(peer.slice("@fixture/".length));
    link(extract(dependency, join(buildRoot, "peers", key)), join(work, "node_modules", peer));
  }
  writeFileSync(join(work, "tsconfig.json"), JSON.stringify({ extends: join(repo, "tsconfig.base.json"), compilerOptions: {
    noEmit: false, declaration: true, emitDeclarationOnly: true, rootDir: "source", outDir: "dist", types: ["node"],
  }, include: ["source/**/*.ts"] }));
  typecheck(work);
  const sources = sourceFiles(join(work, "source"));
  tool(join(repo, "packages/prove/node_modules/.bin/esbuild"), [...sources, "--format=esm", "--platform=neutral",
    `--outbase=${join(work, "source")}`, `--outdir=${join(work, "dist")}`, "--log-level=warning"], work);

  const archives = join(buildRoot, "archives", key);
  mkdirSync(archives, { recursive: true });
  const npmrc = join(buildRoot, "npmrc");
  writeFileSync(npmrc, "");
  const packed = JSON.parse(tool("npm", ["pack", "--ignore-scripts", "--offline", "--json", "--pack-destination", archives,
    "--userconfig", npmrc, "--cache", join(buildRoot, "npm-cache")], work)) as ReadonlyArray<{ filename: string; files: ReadonlyArray<{ path: string }> }>;
  expect(packed).toHaveLength(1);
  const archive = join(archives, packed[0]!.filename);
  const result: Built = { kind, name: manifest.name, version, variant, archive, sha256: createHash("sha256").update(readFileSync(archive)).digest("hex"),
    packed: packed[0]!.files.map((f) => f.path).sort(), sources: sources.map((path) => relative(join(work, "source"), path)) };
  built.set(key, result);
  return result;
};
const built = new Map<string, Built>();

/** Extract a built package's archive into `<into>/<name>` (a fresh folder) and say where it is. */
export const extract = (pack: Built, into: string): string => {
  const target = join(into, pack.name);
  rmSync(target, { recursive: true, force: true });
  mkdirSync(target, { recursive: true });
  tool("tar", ["-xzf", pack.archive, "--strip-components", "1", "-C", target], into);
  return target;
};

export interface Installed extends Built {
  /** Where the package now is: `<root>/node_modules/<name>`. */
  readonly installed: string;
}

/**
 * Install a fixture the way a package manager would: its packed archive extracted into the project's node_modules, and
 * the dependency added to the project's package.json, as an exact pin (the default) or as a range for `ortho add` to pin.
 */
export const installFixture = (root: string, kind = "echo", options: { readonly variant?: string; readonly version?: string; readonly pin?: "exact" | "range" } = {}): Installed => {
  const pack = build(kind, options);
  const installed = extract(pack, join(root, "node_modules"));
  const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { dependencies?: Record<string, string> };
  manifest.dependencies = { ...manifest.dependencies, [pack.name]: options.pin === "range" ? `^${pack.version}` : pack.version };
  writeFileSync(join(root, "package.json"), JSON.stringify(manifest, null, 2) + "\n");
  return { ...pack, installed };
};
