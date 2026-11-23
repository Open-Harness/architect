// One reading of the project's files: a content hash by relative path, and the source of each code file, taken once so that
// what a proof is recorded against is what was read when it began, never what is on disk when it ends.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { digest } from "./digest.ts";
import { linkedFiles } from "./linked.ts";

export interface Snapshot {
  readonly root: string;
  readonly hashes: Map<string, string>;
  readonly sources: Map<string, string>;
}

export { digest };

/** Folders whose every file can change a proof. generated/ is in: the server and the model are made there, and a change to either is not a thing the model places. */
const FOLDERS = ["blueprint", "src", "journeys", "generated"];
const CODE = /\.[cm]?[jt]sx?$/;
/** A test cannot reach a running world; a note can only where code may read it (src/, blueprint/). */
const quiet = (path: string) => /\.(test|spec)\.[cm]?[jt]sx?$/.test(path) || (path.endsWith(".md") && !path.startsWith("src/") && !path.startsWith("blueprint/"));
const rootFile = (name: string) => name === "ortho.config.ts" || name === "package.json" || name === "pnpm-lock.yaml" || /^tsconfig.*\.json$/.test(name) || name === ".env" || name.startsWith(".env.");
const LOCKS = ["pnpm-lock.yaml", "pnpm-workspace.yaml", "package-lock.json", "npm-shrinkwrap.json", "yarn.lock", "bun.lock", "bun.lockb"];
/** What a workspace's lockfile is called in the record: the same wherever the project sits. */
export const WORKSPACE = "<workspace>";

const within = (root: string, folder: string): ReadonlyArray<string> =>
  readdirSync(join(root, folder), { withFileTypes: true }).flatMap((entry) => {
    if (entry.name.startsWith(".") || entry.name === "node_modules") return [];
    const path = `${folder}/${entry.name}`;
    if (entry.isDirectory()) return within(root, path);
    return entry.isFile() && !quiet(path) ? [path] : [];
  });

/** The nearest folder above the project that holds a lockfile: the workspace the project's dependencies are locked in. */
const workspaceOf = (root: string): string | undefined => {
  for (let dir = dirname(root); dir !== dirname(dir); dir = dirname(dir)) if (LOCKS.some((name) => existsSync(join(dir, name)))) return dir;
  return undefined;
};

/** Read one file into the snapshot under `path`, from `from`. */
const take = (snap: Snapshot, path: string, from: string) => {
  const bytes = readFileSync(from);
  snap.hashes.set(path, digest(bytes));
  if (CODE.test(path) || /(^|\/)tsconfig[^/]*\.json$/.test(path)) snap.sources.set(path, bytes.toString("utf8"));
};

export const scan = (root: string): Snapshot => {
  const snap: Snapshot = { root, hashes: new Map(), sources: new Map() };
  const paths = [
    ...FOLDERS.filter((folder) => existsSync(join(root, folder))).flatMap((folder) => within(root, folder)),
    ...readdirSync(root, { withFileTypes: true }).filter((e) => e.isFile() && rootFile(e.name)).map((e) => e.name),
  ].sort();
  for (const path of paths) take(snap, path, join(root, path));
  const workspace = workspaceOf(root);
  if (workspace !== undefined) for (const name of LOCKS) if (existsSync(join(workspace, name))) take(snap, `${WORKSPACE}/${name}`, join(workspace, name));
  // Packages linked from source (workspace siblings, `link:`, `file:`) are not in any lockfile's hashes: their files are, unplaceable.
  for (const [key, hash] of linkedFiles(root, workspace)) snap.hashes.set(key, hash);
  return snap;
};

/** A file of the project outside the folders above that something imports: it is read in, so a change to it is seen. */
export const include = (snap: Snapshot, path: string): boolean => {
  if (snap.hashes.has(path)) return true;
  const file = join(snap.root, path);
  if (!existsSync(file) || !statSync(file).isFile()) return false;
  take(snap, path, file);
  return true;
};
