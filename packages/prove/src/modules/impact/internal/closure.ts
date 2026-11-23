// The files a file can reach by importing, inside the project. Whatever cannot be followed is opaque, and a change to an
// opaque file is not placed: `prove --changed` then proves everything, naming it.
import { posix } from "node:path";
import { include, type Snapshot } from "./scan.ts";

export interface Closure {
  readonly files: ReadonlySet<string>;
  /** Files whose imports could not all be followed (an alias, a path outside the project, a file that is not there, a specifier that is not a literal). */
  readonly opaque: ReadonlySet<string>;
  /** Files that import or require something whose specifier is not a literal: what they reach could be any file, so what rests on them rests on every file. */
  readonly wild: ReadonlySet<string>;
}

const IMPORT = /\b(?:import|export)\s[^'"`;]*?\bfrom\s*['"]([^'"\n]+)['"]|\bimport\s*['"]([^'"\n]+)['"]|\bimport\(\s*['"]([^'"\n]+)['"]\s*\)|\brequire\(\s*['"]([^'"\n]+)['"]\s*\)/g;
const EXTENSIONS = [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs", ".json"];

/** Every module specifier a source names, from imports, re-exports, `import()` and `require()`; a mention in a comment only adds an edge. */
export const specifiersOf = (source: string): ReadonlyArray<string> =>
  [...source.matchAll(IMPORT)].map((m) => m[1] ?? m[2] ?? m[3] ?? m[4]!);

/** `import(x)` or `require(x)` whose argument is not a string literal: where it goes cannot be read. */
const DYNAMIC = /\b(?:import|require)\s*\(\s*(?!['"])/;
/** A file that reads files at runtime (`readFileSync(new URL("./x", import.meta.url))`, `fs`, a glob): what it reads is no import, so it rests on every file. */
const READS = /\bimport\.meta\.(?:url|dirname|filename|glob|resolve)\b|\b(?:readFile|readFileSync|readdir|readdirSync|createReadStream|readFileSync)\s*\(|\bfs\.promises\b|\bnew URL\(/;

/** The aliases a tsconfig's `paths` declares, as the prefix before their `*`: a specifier that starts with one is the project's, not a package's. */
const aliasesIn = (snap: Snapshot): ReadonlyArray<string> =>
  [...snap.sources].filter(([path]) => /(^|\/)tsconfig[^/]*\.json$/.test(path)).flatMap(([, source]) => {
    const block = source.match(/"paths"\s*:\s*\{([^}]*)\}/)?.[1] ?? "";
    return [...block.matchAll(/"([^"]+)"\s*:/g)].map((m) => m[1]!.replace(/\*.*$/, ""));
  });

type Found = { readonly kind: "file"; readonly path: string } | { readonly kind: "package" } | { readonly kind: "unknown" };

const candidates = (base: string): ReadonlyArray<string> => {
  const swapped = /\.[cm]?js$/.test(base) ? [base.replace(/\.js$/, ".ts"), base.replace(/\.js$/, ".tsx"), base.replace(/\.mjs$/, ".mts"), base.replace(/\.cjs$/, ".cts")] : [];
  return [base, ...swapped, ...EXTENSIONS.map((e) => base + e), ...EXTENSIONS.map((e) => `${base}/index${e}`)];
};

const resolve = (snap: Snapshot, aliases: ReadonlyArray<string>, from: string, spec: string): Found => {
  if (spec.startsWith("node:")) return { kind: "package" };
  if (!spec.startsWith(".")) return spec.startsWith("#") || spec.startsWith("~/") || spec.startsWith("@/") || aliases.some((a) => a !== "" && spec.startsWith(a)) ? { kind: "unknown" } : { kind: "package" };
  const base = posix.normalize(posix.join(posix.dirname(from), spec));
  if (base.startsWith("..") || posix.isAbsolute(base)) return { kind: "unknown" };
  if (base.split("/").includes("node_modules")) return { kind: "package" };
  const path = candidates(base).find((candidate) => include(snap, candidate));
  return path === undefined ? { kind: "unknown" } : { kind: "file", path };
};

/** A closure computer for a snapshot: each file's imports are read once. */
export const graphOf = (snap: Snapshot) => {
  const aliases = aliasesIn(snap);
  const memo = new Map<string, { readonly deps: ReadonlyArray<string>; readonly opaque: boolean; readonly wild: boolean }>();
  const edges = (file: string) => {
    const known = memo.get(file);
    if (known !== undefined) return known;
    const source = snap.sources.get(file);
    const found = (source === undefined ? [] : specifiersOf(source)).map((spec) => resolve(snap, aliases, file, spec));
    const dynamic = source !== undefined && DYNAMIC.test(source);
    const wild = dynamic || (source !== undefined && READS.test(source));
    const made = { deps: found.flatMap((f) => (f.kind === "file" ? [f.path] : [])), opaque: dynamic || found.some((f) => f.kind === "unknown"), wild };
    memo.set(file, made);
    return made;
  };
  return (roots: ReadonlyArray<string>): Closure => {
    const files = new Set<string>();
    const opaque = new Set<string>();
    const wild = new Set<string>();
    const queue = roots.filter((r) => snap.hashes.has(r));
    for (const file of queue) {
      if (files.has(file)) continue;
      files.add(file);
      const { deps, opaque: lost, wild: loose } = edges(file);
      if (lost) opaque.add(file);
      if (loose) wild.add(file);
      queue.push(...deps);
    }
    return { files, opaque, wild };
  };
};
