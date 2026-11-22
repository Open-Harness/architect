// The instruments of check 40's seam half (M1.50): where `elkjs` and `@xyflow/react` may be declared and imported, and a scanner for elk in a built client.
// Both read plain text, so a control can plant one wrong file and the verdict never rests on an unproved tool.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { repo } from "./support.ts";

export const FIELDS = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"] as const;
export type Manifest = Partial<Record<(typeof FIELDS)[number], Record<string, string>>>;

/** Every package.json the project owns (`packages/*`, `examples/*`, `e2e`, the root), by path from the repository; never node_modules, spikes or worktrees. */
export const manifests = (root = repo): Record<string, Manifest> => {
  const found: Record<string, Manifest> = {};
  const read = (path: string) => { if (existsSync(join(root, path))) found[path] = JSON.parse(readFileSync(join(root, path), "utf8")) as Manifest; };
  read("package.json");
  read("e2e/package.json");
  read("docs/canon/package.json");
  for (const area of ["packages", "examples"]) if (existsSync(join(root, area))) for (const d of readdirSync(join(root, area), { withFileTypes: true })) if (d.isDirectory()) read(`${area}/${d.name}/package.json`);
  return found;
};

const EXACT = /^\d+\.\d+\.\d+$/;
/** Where `name` is declared, by package.json and field. */
const where = (all: Record<string, Manifest>, name: string) => Object.entries(all).flatMap(([path, m]) => FIELDS.flatMap((f) => Object.entries(m[f] ?? {}).filter(([key, version]) => key === name || version.includes(`npm:${name}@`)).map(([, version]) => ({ path, field: f, version }))));

/** `elkjs` is the generator's: a pinned dependency of `packages/generators` and declared nowhere else, so it can never reach a bundle through a package that ships. */
export const elkDeclaration = (all: Record<string, Manifest>): ReadonlyArray<string> => {
  const at = where(all, "elkjs");
  const mine = at.filter((a) => a.path === "packages/generators/package.json" && a.field === "dependencies");
  return [
    ...(mine.length === 1 ? [] : ["`elkjs` is not a dependency of packages/generators"]),
    ...mine.filter((a) => !EXACT.test(a.version)).map((a) => `\`elkjs\` is "${a.version}" in ${a.path}: dependencies are pinned exactly`),
    ...at.filter((a) => !mine.includes(a)).map((a) => `\`elkjs\` is declared in ${a.path} (${a.field}): only the generator's own dependencies may hold it`),
  ];
};

/** `@xyflow/react` is portal-ui's: in its dependencies or peer dependencies, pinned exactly where it is installed, and nowhere else. */
export const flowDeclaration = (all: Record<string, Manifest>): ReadonlyArray<string> => {
  const at = where(all, "@xyflow/react");
  const mine = at.filter((a) => a.path === "packages/portal-ui/package.json");
  return [
    ...(mine.some((a) => a.field === "dependencies" || a.field === "peerDependencies") ? [] : ["`@xyflow/react` is neither a dependency nor a peer dependency of packages/portal-ui"]),
    ...mine.filter((a) => a.field !== "peerDependencies" && !EXACT.test(a.version)).map((a) => `\`@xyflow/react\` is "${a.version}" in ${a.path} (${a.field}): installed versions are pinned exactly`),
    ...at.filter((a) => !mine.includes(a)).map((a) => `\`@xyflow/react\` is declared in ${a.path} (${a.field}): only portal-ui may hold it`),
  ];
};

/** Source files, as relative path -> text, of the folders given (never node_modules, dist or generated bundles). */
export const sourcesUnder = (dirs: ReadonlyArray<string>, root = repo): Record<string, string> => {
  const found: Record<string, string> = {};
  const walk = (dir: string) => {
    if (!existsSync(join(root, dir))) return;
    for (const e of readdirSync(join(root, dir), { withFileTypes: true })) {
      const path = `${dir}/${e.name}`;
      if (e.isDirectory()) { if (!["node_modules", "dist", ".wrangler", ".ortho"].includes(e.name)) walk(path); } else if (/\.(ts|tsx|mts|js|mjs)$/.test(e.name)) found[path] = readFileSync(join(root, path), "utf8");
    }
  };
  for (const d of dirs) walk(d);
  return found;
};

const IMPORT = (name: string) => new RegExp(`(?:from\\s*|import\\s*\\(?\\s*|require\\s*\\(\\s*)["'\`]${name.replace(/[/.]/g, "\\$&")}(?:/[^"'\`]*)?["'\`]`);
/** The files that import `name` (a bare specifier or a subpath of it). */
export const importing = (files: Record<string, string>, name: string): ReadonlyArray<string> => Object.entries(files).filter(([, text]) => IMPORT(name).test(text)).map(([path]) => path).sort();

/** What a built client carries when elk is in it: its package, its option ids (they survive minifying: they are strings), its Java names. */
export const ELK_MARKERS: ReadonlyArray<RegExp> = [/elkjs/i, /elk\.bundled/, /org\.eclipse\.elk/, /["']elk\.(?:algorithm|layered|direction|edgeRouting|hierarchyHandling)\b/];
/** Every file under a built client, by path and content, whatever it is called: `.js`, `.mjs`, `.cjs`, a worker, a chunk with no extension. Nothing is skipped by name (not `node_modules`, not `.map`), so where a bundle hides elk is no defence. */
export const filesUnder = (root: string): Record<string, string> => {
  const found: Record<string, string> = {};
  const walk = (dir: string) => {
    for (const e of readdirSync(join(root, dir), { withFileTypes: true })) {
      const path = dir === "" ? e.name : `${dir}/${e.name}`;
      if (e.isDirectory()) walk(path); else if (e.isFile()) found[path] = readFileSync(join(root, path), "utf8");
    }
  };
  if (existsSync(root)) walk("");
  return found;
};

/** A built client's text files with elk in them, by path and the marker that matched. */
export const elkInside = (files: Record<string, string>): ReadonlyArray<string> =>
  Object.entries(files).flatMap(([path, text]) => ELK_MARKERS.filter((m) => m.test(text)).map((m) => `${path} matches ${String(m)}`));

/**
 * The lockfile resolves `name` at `version` (a pin to a version that does not exist is no pin): a package key of its own, two spaces in, the whole name from the
 * first character (so `foo-elkjs@0.12.1:` and `@scope/elkjs@0.12.1:` are other packages) and the whole version (so `0.12.10` is not `0.12.1`), quoted or not, with
 * the peer suffix a snapshot key may carry.
 */
export const lockHas = (lock: string, name: string, version: string): boolean =>
  new RegExp(`^ {2}'?${name.replace(/[/.@]/g, "\\$&")}@${version.replace(/[/.@]/g, "\\$&")}(?:\\([^\\n]*\\))?'?:[ ]*$`, "m").test(lock);

const GENERATOR = "packages/generators/src/", PORTAL_UI = "packages/portal-ui/src/";
/** Who imports what, over source files by path: `elkjs` in the generator's own source (its tests too) and nowhere else; `@xyflow/react` in portal-ui's and nowhere else; and each is imported where it belongs. */
export const importProblems = (sources: Record<string, string>): ReadonlyArray<string> => {
  const under = (prefix: string, inside: boolean) => Object.fromEntries(Object.entries(sources).filter(([path]) => path.startsWith(prefix) === inside));
  return [
    ...importing(under(GENERATOR, false), "elkjs").map((p) => `\`elkjs\` is imported in ${p}: only packages/generators/src may`),
    ...(importing(under(GENERATOR, true), "elkjs").length === 0 ? ["the generator does not import `elkjs`: it lays the graphs out with it"] : []),
    ...importing(under(PORTAL_UI, false), "@xyflow/react").map((p) => `\`@xyflow/react\` is imported in ${p}: only packages/portal-ui/src may`),
    ...(importing(under(PORTAL_UI, true), "@xyflow/react").length === 0 ? ["portal-ui does not import `@xyflow/react`: its Graph draws with it"] : []),
  ];
};
