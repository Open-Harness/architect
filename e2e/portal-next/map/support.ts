// What the map's checks share: a copy of Plugged In (the project the map's examples are written against), fixture folders laid over
// it, and `ortho generate` run as a user runs it. Nothing here reads the compiler: the checks read its exit code, its words and the
// files it writes.
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { copyOf, ortho, repo } from "../../layer1/support.ts";

export { repo };
export const pluggedIn = join(repo, "examples/plugged-in");
export const acme = join(repo, "examples/acme");
const fixtures = join(import.meta.dirname, "../fixtures");

export interface Project {
  readonly root: string;
  readonly remove: () => void;
  /** `ortho <args> --root <project>`, in a real process. */
  readonly ortho: (...args: ReadonlyArray<string>) => { readonly status: number | null; readonly out: string };
  readonly read: (path: string) => string;
  readonly json: <T = Record<string, any>>(path: string) => T;
  readonly exists: (path: string) => boolean;
  /** Every file under a folder of the project, by path from the project, sorted. */
  readonly files: (folder: string) => ReadonlyArray<string>;
}

export const walk = (root: string, folder: string): ReadonlyArray<string> => {
  const at = join(root, folder);
  if (!existsSync(at)) return [];
  return readdirSync(at).sort().flatMap((name) => (statSync(join(at, name)).isDirectory() ? walk(root, join(folder, name)) : [join(folder, name)]));
};

/** A copy of an example with the named fixture folders (`e2e/portal-next/fixtures/<name>/`) laid over it, in order: a later one replaces a file of an earlier one. */
export const project = (overlays: ReadonlyArray<string> = [], example: string = pluggedIn): Project => {
  const copy = copyOf(example);
  for (const name of overlays) cpSync(join(fixtures, name), copy.root, { recursive: true });
  const run = (...args: ReadonlyArray<string>) => { const r = ortho(copy.root, ...args); return { status: r.status, out: `${r.stdout}${r.stderr}` }; };
  return {
    root: copy.root,
    remove: copy.remove,
    ortho: run,
    read: (path) => readFileSync(join(copy.root, path), "utf8"),
    json: <T,>(path: string) => JSON.parse(readFileSync(join(copy.root, path), "utf8")) as T,
    exists: (path) => existsSync(join(copy.root, path)),
    files: (folder) => walk(copy.root, folder),
  };
};

/** `ortho generate`, which must succeed: what it says if it does not. */
export const generated = (p: Project): Project => {
  const result = p.ortho("generate");
  if (result.status !== 0) throw new Error(`ortho generate exited ${String(result.status)}:\n${result.out}`);
  return p;
};

export const modelOf = (p: Project) => p.json("generated/model/model.json");

/** Run a module of the project (a generated file) in its own Node process and return what it printed as JSON: the generated TypeScript as a program reads it. */
export const evaluate = (p: Project, specifier: string, expression: string): unknown => {
  const script = `const m = await import(${JSON.stringify(`file://${join(p.root, specifier)}`)}); console.log(JSON.stringify(${expression}));`;
  const run = spawnSync(process.execPath, ["--input-type=module", "-e", script], { cwd: p.root, encoding: "utf8" });
  if (run.status !== 0) throw new Error(`could not run ${specifier}: ${run.stderr.split("\n").slice(0, 4).join(" | ")}`);
  return JSON.parse(run.stdout.trim().split("\n").at(-1) ?? "null");
};
