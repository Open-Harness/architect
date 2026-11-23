// The plugins a project depends on, found through its package.json and loaded from its node_modules, the way the
// project's own imports resolve them: so a mount's `import plugin from "@x/y"` and the compiler hold the same object.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative, sep } from "node:path";
import { pathToFileURL } from "node:url";

export interface Manifest {
  readonly name?: string;
  readonly version?: string;
  readonly dependencies?: Readonly<Record<string, string>>;
  readonly devDependencies?: Readonly<Record<string, string>>;
  readonly peerDependencies?: Readonly<Record<string, string>>;
  readonly orthograph?: { readonly kind?: string; readonly blueprint?: string; readonly src?: string };
}

export const readManifest = (file: string): Manifest => JSON.parse(readFileSync(file, "utf8")) as Manifest;

/** The project's dependencies, every kind, by name. */
export const dependenciesOf = (manifest: Manifest): ReadonlyArray<string> =>
  [...new Set([...Object.keys(manifest.dependencies ?? {}), ...Object.keys(manifest.devDependencies ?? {}), ...Object.keys(manifest.peerDependencies ?? {})])].sort();

/** Where an installed package is: the first `node_modules/<name>` from the project up. */
export const packageDir = (root: string, name: string): string | undefined => {
  for (let dir = root; ; dir = dirname(dir)) {
    const candidate = join(dir, "node_modules", name);
    if (existsSync(join(candidate, "package.json"))) return candidate;
    if (dirname(dir) === dir) return undefined;
  }
};

/** A file the project's own imports would load for `specifier`, as a URL. */
export const resolveFrom = (root: string, specifier: string): string =>
  pathToFileURL(createRequire(join(root, "package.json")).resolve(specifier)).href;

const walk = (dir: string, keep: (file: string) => boolean): Array<string> =>
  readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? (entry === "node_modules" ? [] : walk(full, keep)) : keep(full) ? [full] : [];
  });
const slashed = (path: string) => path.split(sep).join("/");

/** `sha256-<base64>` over each file's path inside the package and its bytes, in path order; over `only` those files, when given. */
export const integrityOf = (dir: string, only?: ReadonlyArray<string>): string => {
  const hash = createHash("sha256");
  for (const file of walk(dir, (f) => only === undefined || only.includes(slashed(relative(dir, f)))).map((f) => slashed(relative(dir, f))).sort()) {
    hash.update(file).update("\0").update(readFileSync(join(dir, file))).update("\0");
  }
  return `sha256-${hash.digest("base64")}`;
};

/** The `.js` files under a plugin's blueprint folder, or its `.ts` files when it ships as source (no build), relative to it, sorted. */
export const blueprintFilesOf = (folder: string): ReadonlyArray<string> =>
  walk(folder, (f) => f.endsWith(".js") || (f.endsWith(".ts") && !f.endsWith(".d.ts"))).map((f) => slashed(relative(folder, f))).sort();

/** A plugin's declared blueprint folder, as installed for the project, when it has one. */
export const pluginFolder = (root: string, name: string): string | undefined => {
  const dir = packageDir(root, name);
  const declared = dir ? readManifest(join(dir, "package.json")).orthograph?.blueprint : undefined;
  return dir && declared && existsSync(join(dir, declared)) ? join(dir, declared) : undefined;
};
