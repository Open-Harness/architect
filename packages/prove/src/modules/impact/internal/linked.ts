// Packages the project runs from source it does not own: a workspace sibling, a `link:` or `file:` dependency, any symlink
// that leaves the package store. A lockfile does not change when their files do, so their files are hashed, and a change to
// one is never placed: `prove --changed` proves everything and names the package.
import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { dirname, join } from "node:path";
import { Effect } from "effect";
import { digest } from "./digest.ts";

/** What a record names a linked package's file by: the same wherever the project sits. */
export const packageKey = (name: string, path: string) => `<package:${name}>/${path}`;

const LOCAL = /^(workspace|link|file):/;
const quiet = (name: string) => /\.(test|spec)\.[cm]?[jt]sx?$/.test(name) || name.endsWith(".md");

interface Manifest { readonly dependencies?: Record<string, string>; readonly devDependencies?: Record<string, string>; readonly optionalDependencies?: Record<string, string> }

const manifestOf = (dir: string): Manifest =>
  Effect.runSync(Effect.try(() => JSON.parse(readFileSync(join(dir, "package.json"), "utf8")) as Manifest).pipe(Effect.orElseSucceed((): Manifest => ({}))));

const declared = (dir: string): ReadonlyArray<readonly [string, string]> => {
  const m = manifestOf(dir);
  return Object.entries({ ...m.optionalDependencies, ...m.devDependencies, ...m.dependencies });
};

/** Where `name` is installed for a package at `from`: its own node_modules, then each folder above's, as node looks. */
const installed = (from: string, name: string): string | undefined => {
  for (let dir = from; ; dir = dirname(dir)) {
    const found = join(dir, "node_modules", name);
    if (existsSync(found)) return found;
    if (dir === dirname(dir)) return undefined;
  }
};

const filesOf = (dir: string, within = ""): ReadonlyArray<string> =>
  readdirSync(join(dir, within), { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) return [];
    const path = within === "" ? entry.name : `${within}/${entry.name}`;
    return entry.isDirectory() ? filesOf(dir, path) : entry.isFile() && !quiet(entry.name) ? [path] : [];
  });

/** The files of every linked package the project (and its workspace) depends on, by key, with a hash of each. */
export const linkedFiles = (root: string, workspace: string | undefined): ReadonlyMap<string, string> => {
  const found = new Map<string, string>();
  const seen = new Set<string>();
  const visit = (from: string, name: string, spec: string) => {
    const path = installed(from, name);
    if (path === undefined) return;
    const real = realpathSync(path);
    // A symlink into the package store is an installed package, and the lockfile says which; any other is source someone edits.
    const linked = LOCAL.test(spec) || (lstatSync(path).isSymbolicLink() && !real.split("/").includes(".pnpm"));
    if (!linked || seen.has(real)) return;
    seen.add(real);
    for (const file of filesOf(real)) found.set(packageKey(name, file), digest(readFileSync(join(real, file))));
    for (const [dep, wanted] of declared(real)) visit(real, dep, wanted);
  };
  for (const dir of [root, ...(workspace === undefined ? [] : [workspace])]) for (const [name, spec] of declared(dir)) visit(root, name, spec);
  return found;
};
