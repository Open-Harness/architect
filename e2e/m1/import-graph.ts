// The import graph K19's line is judged on: from a root file, every file it can reach (relative imports, `#modules/*` package imports,
// and workspace packages through their `exports`), and the outside names it imports on the way. A name that is the UI (`react`,
// `react-dom`, `@orthograph/portal-ui`, HeroUI, HeroUI Pro) is a breach, reported with the chain of files that leads to it. Type-only
// imports count: the rule says "imports", and a server that names React's types has React in its types. The reader is a port, so the
// walker is tried on planted in-memory graphs before it judges the repository.
import { dirname, join, normalize } from "node:path";

export interface Files {
  /** A text file by absolute path; `undefined` when it is not there. */
  readonly read: (path: string) => string | undefined;
}
/** Workspace packages by name: the folder each lives in. */
export type Workspace = Readonly<Record<string, string>>;

export interface Breach { readonly specifier: string; readonly importer: string; readonly via: ReadonlyArray<string> }

const UI = [/^react(-dom)?(\/|$)/, /^@orthograph\/portal-ui(\/|$)/, /^@heroui(-pro)?\//];
/** The names a Worker must not reach: React, the portal's UI and HeroUI. Spelled as patterns so this file does not carry the licensed name. */
export const isUi = (specifier: string): boolean => UI.some((pattern) => pattern.test(specifier));

const stripComments = (source: string): string => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[\s;{}()])\/\/[^\n]*/g, "$1");

/** Every module name a source file imports, statically, dynamically, re-exported or required. */
export const importsOf = (source: string): ReadonlyArray<string> => {
  const text = stripComments(source);
  const found = [
    ...text.matchAll(/\b(?:import|export)\b[^"'`;]*?\bfrom\s*["']([^"']+)["']/g),
    ...text.matchAll(/\bimport\s*["']([^"']+)["']/g),
    ...text.matchAll(/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g),
    ...text.matchAll(/\brequire\s*\(\s*["']([^"']+)["']\s*\)/g),
  ];
  return [...new Set(found.map((m) => m[1]!))];
};

const CODE = /\.(ts|tsx|mts|js|mjs)$/;
const asFile = (files: Files, base: string): string | undefined => {
  const stem = base.replace(/\.(js|mjs)$/, "");
  return [base, `${stem}.ts`, `${stem}.tsx`, `${stem}.mts`, `${base}.ts`, `${base}.tsx`, join(base, "index.ts")].find((p) => CODE.test(p) && files.read(p) !== undefined);
};

const json = (files: Files, path: string): Record<string, unknown> | undefined => {
  const text = files.read(path);
  if (text === undefined) return undefined;
  try { return JSON.parse(text) as Record<string, unknown>; } catch { return undefined; }
};
const nearestPackage = (files: Files, from: string): string | undefined => {
  for (let dir = dirname(from); dir !== dirname(dir); dir = dirname(dir)) if (files.read(join(dir, "package.json")) !== undefined) return dir;
  return undefined;
};
const target = (value: unknown): string | undefined =>
  typeof value === "string" ? value : typeof value === "object" && value !== null ? target((value as Record<string, unknown>)["import"] ?? (value as Record<string, unknown>)["default"] ?? (value as Record<string, unknown>)["types"]) : undefined;
/** `#modules/*.js` against `{ "#modules/*.js": "./src/modules/*.ts" }`, and `./sub` against an `exports` map. */
const mapped = (map: Record<string, unknown> | undefined, key: string): string | undefined => {
  if (map === undefined) return undefined;
  const exact = target(map[key]);
  if (exact !== undefined) return exact;
  for (const [pattern, value] of Object.entries(map)) {
    const star = pattern.indexOf("*");
    if (star < 0) continue;
    const [head, tail] = [pattern.slice(0, star), pattern.slice(star + 1)];
    if (key.startsWith(head) && key.endsWith(tail) && key.length >= head.length + tail.length) return target(value)?.replace("*", key.slice(head.length, key.length - tail.length));
  }
  return undefined;
};

/** Where a name goes: a file to read next, or an outside name. */
const resolve = (files: Files, workspace: Workspace, from: string, specifier: string): { readonly file: string } | { readonly outside: string } | undefined => {
  if (specifier.startsWith("node:")) return undefined;
  if (specifier.startsWith(".")) { const file = asFile(files, normalize(join(dirname(from), specifier))); return file === undefined ? undefined : { file }; }
  if (specifier.startsWith("#")) {
    const pkg = nearestPackage(files, from);
    const to = pkg === undefined ? undefined : mapped(json(files, join(pkg, "package.json"))?.["imports"] as Record<string, unknown> | undefined, specifier);
    const file = to === undefined ? undefined : asFile(files, normalize(join(pkg!, to)));
    return file === undefined ? undefined : { file };
  }
  const parts = specifier.split("/");
  const name = specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0]!;
  const dir = workspace[name];
  if (dir === undefined || isUi(specifier)) return { outside: specifier };
  const sub = `.${specifier.slice(name.length)}`;
  const to = mapped(json(files, join(dir, "package.json"))?.["exports"] as Record<string, unknown> | undefined, sub);
  const file = to === undefined ? undefined : asFile(files, normalize(join(dir, to)));
  return file === undefined ? { outside: specifier } : { file };
};

/** Every UI name reachable from the roots, once each, with the chain that leads to it. */
export const breaches = (files: Files, workspace: Workspace, roots: ReadonlyArray<string>, relative: (path: string) => string = (p) => p): ReadonlyArray<Breach> => {
  const seen = new Set<string>();
  const found = new Map<string, Breach>();
  const walk = (file: string, via: ReadonlyArray<string>) => {
    if (seen.has(file)) return;
    seen.add(file);
    const chain = [...via, relative(file)];
    for (const specifier of importsOf(files.read(file) ?? "")) {
      const to = resolve(files, workspace, file, specifier);
      if (to === undefined) continue;
      if ("file" in to) walk(to.file, chain);
      else if (isUi(to.outside) && !found.has(`${to.outside}@${relative(file)}`)) found.set(`${to.outside}@${relative(file)}`, { specifier: to.outside, importer: relative(file), via: chain });
    }
  };
  for (const root of roots) walk(root, []);
  return [...found.values()];
};

/** The file `@orthograph/portal/server` is: the package's `exports["./server"]`, or `undefined` when it exports none. */
export const entryOf = (files: Files, packageDir: string, subpath: string): string | undefined => {
  const to = mapped(json(files, join(packageDir, "package.json"))?.["exports"] as Record<string, unknown> | undefined, subpath);
  return to === undefined ? undefined : asFile(files, normalize(join(packageDir, to)));
};
