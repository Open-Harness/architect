// What the checks share about a generated adapter plugin: a project to generate it into, `ortho new adapter` run as a
// user runs it, the plugin built and installed the way a workspace links it, and its descriptor loaded.
import { spawnSync } from "node:child_process";
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { expect } from "vitest";
import { acme, cli, copyOf, repo } from "../layer1/support.ts";

export { acme, repo };
export type Node = { readonly [key: string]: any };

export interface Project { readonly root: string; readonly remove: () => void }
const projects: Array<Project> = [];

/** A copy of acme to generate into and mount in: `plugins/` is empty, so a plugin there is the one just generated. */
export const project = (): Project => {
  const copy = copyOf(acme);
  projects.push(copy);
  return copy;
};
export const removeProjects = () => { for (const p of projects.splice(0)) p.remove(); };

export const run = (root: string, args: ReadonlyArray<string>) => {
  const r = spawnSync(process.execPath, [process.env["ORTHO_CLI"] ?? cli, ...args, "--root", root], { cwd: root, encoding: "utf8", maxBuffer: 256 * 1024 * 1024, timeout: 900_000 });
  return { status: r.status, stdout: r.stdout, stderr: r.stderr, out: `${r.stdout}${r.stderr}` };
};

/** `ortho new adapter <name> --from-openapi <spec>`: the plugin lands in `<root>/plugins/<name>/`. */
export const newAdapter = (root: string, name: string, spec: string, ...more: ReadonlyArray<string>) => run(root, ["new", "adapter", name, "--from-openapi", spec, ...more]);
export const pluginDir = (root: string, name: string) => join(root, "plugins", name);

/** Every file under a folder, relative, sorted. */
export const filesUnder = (dir: string): ReadonlyArray<string> =>
  existsSync(dir) ? readdirSync(dir, { recursive: true, withFileTypes: true }).filter((e) => e.isFile() && !e.parentPath.includes("node_modules")).map((e) => join(e.parentPath, e.name).slice(dir.length + 1)).sort() : [];
export const read = (file: string) => readFileSync(file, "utf8");

/** The plugin's package.json. */
export const manifest = (dir: string) => JSON.parse(read(join(dir, "package.json"))) as Node;

/** `npm run build` in the plugin, if it has one, from the repository's tools and nothing from the network. */
export const build = (dir: string) => {
  if (manifest(dir)["scripts"]?.["build"] === undefined) return;
  const r = spawnSync("npm", ["run", "build", "--offline"], { cwd: dir, encoding: "utf8", timeout: 900_000, maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, PATH: `${join(repo, "node_modules/.bin")}:${process.env["PATH"] ?? ""}` } });
  expect(r.status, `npm run build in ${dir}:\n${r.stdout}\n${r.stderr}`).toBe(0);
};

/**
 * Installed the way a workspace links a package: `node_modules/@orthograph/<name>` points at the plugin, and the project
 * depends on it. acme's own `@orthograph` folder is shared by every copy, so the copy gets a folder of its own first.
 */
export const install = (root: string, name: string, dir = pluginDir(root, name)) => {
  const scope = join(root, "node_modules/@orthograph");
  if (lstatSync(scope).isSymbolicLink()) {
    const shared = readdirSync(scope);
    unlinkSync(scope);
    mkdirSync(scope);
    for (const entry of shared) symlinkSync(join(acme, "node_modules/@orthograph", entry), join(scope, entry));
  }
  symlinkSync(dir, join(scope, name));
  const file = join(root, "package.json");
  const project = JSON.parse(read(file)) as Node;
  writeFileSync(file, JSON.stringify({ ...project, dependencies: { ...project["dependencies"], [`@orthograph/${name}`]: manifest(dir)["version"] ?? "0.0.0" } }, null, 2) + "\n");
};

/** The module a plugin's package exports at `sub` (`"."`, `"./client"`), imported. */
export const load = async (dir: string, sub = "."): Promise<Node> => {
  const exported = manifest(dir)["exports"]?.[sub] ?? (sub === "." ? manifest(dir)["main"] : undefined);
  const entry = typeof exported === "string" ? exported : exported?.["default"];
  expect(typeof entry, `${dir}/package.json exports no "${sub}"`).toBe("string");
  return (await import(pathToFileURL(join(dir, entry as string)).href)) as Node;
};

/** The adapter descriptor: the entry's default export. */
export const descriptor = async (dir: string): Promise<Node> => {
  const entry = await load(dir);
  expect(entry["default"], `${dir}: the package entry has no default export`).toBeDefined();
  return entry["default"] as Node;
};

/** Every call of a descriptor as its dotted name: `calls` is groups of calls, written `calls.<group>.<call>`, or flat. */
export const callNames = (calls: Node, prefix = ""): ReadonlyArray<string> =>
  Object.entries<Node>(calls).flatMap(([k, v]) => (v?.["kind"] === "call" ? [`${prefix}${k}`] : typeof v === "object" && v !== null ? callNames(v, `${prefix}${k}.`) : [])).sort();
/** One call, as the client or the descriptor has it. */
export type CallFn = (input?: unknown) => Promise<any>;
export const at = (calls: Node, dotted: string): CallFn => dotted.split(".").reduce<Node>((n, k) => n?.[k], calls) as unknown as CallFn;

/** Make something once, on first use, and hand every later caller the same result (or the same failure): a build shared by a file's tests, each of which still fails by name. */
export const once = <A>(make: () => Promise<A>): (() => Promise<A>) => {
  let made: Promise<A> | undefined;
  return () => (made ??= make());
};
