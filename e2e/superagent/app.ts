// What checks 08 to 17 share: examples/superagent copied outside the repository (as the layer checks copy acme), the
// project generated, its model read, and `ortho check` run on a copy with something wrong planted in it.
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, symlinkSync, unlinkSync, writeFileSync, lstatSync } from "node:fs";
import { dirname, join } from "node:path";
import { expect } from "vitest";
import { copyOf, repo } from "../layer1/support.ts";
import { run, type Node } from "./plugin.ts";

export { repo, run };
export type { Node };

// The app under test. SUPERAGENT_APP points the checks at another folder: for the author's fairness proofs (a throwaway app that
// should pass, or fail for one named reason), never in CI.
export const superagent = process.env["SUPERAGENT_APP"] ?? join(repo, "examples/superagent");
/** What a copy takes from the app: no `generated/` (a check generates it), and no `plugins/` (node_modules links to them, unless a check swaps one). */
const PARTS = ["ortho.config.ts", "blueprint", "src", "journeys", "package.json"];

/** The first thing every check says when the app isn't there: the right reason to be red today. */
export const appExists = () =>
  expect(existsSync(join(superagent, "ortho.config.ts")), "examples/superagent has no blueprint yet: slice 5 builds it (design/goals/17-superagent.md, slice 5)").toBe(true);

const copies: Array<{ remove: () => void }> = [];
export const removeCopies = () => { for (const c of copies.splice(0)) c.remove(); };
export const copyApp = (parts: ReadonlyArray<string> = PARTS) => {
  appExists();
  const c = copyOf(superagent, parts.filter((p) => existsSync(join(superagent, p))));
  copies.push(c);
  return c.root;
};

export const read = (root: string, rel: string) => readFileSync(join(root, rel), "utf8");
export const write = (root: string, rel: string, text: string) => {
  mkdirSync(dirname(join(root, rel)), { recursive: true });
  writeFileSync(join(root, rel), text);
};
/** Change a file of a copy; the edit must find what it changes (a missed edit would make a refusal check pass for no reason). */
export const edit = (root: string, rel: string, change: (text: string) => string) => {
  const before = read(root, rel);
  const after = change(before);
  expect(after, `${rel}: the edit this check plants found nothing to change, so the file is not written as the design's example is`).not.toBe(before);
  write(root, rel, after);
};

export const filesUnder = (root: string, rel: string): ReadonlyArray<string> =>
  existsSync(join(root, rel)) ? readdirSync(join(root, rel), { recursive: true, withFileTypes: true }).filter((e) => e.isFile()).map((e) => join(e.parentPath, e.name).slice(root.length + 1)).sort() : [];

export interface Built { readonly root: string; readonly model: Node; readonly docs: (rel: string) => string; readonly allDocs: string; readonly mcp: string }

/** A copy of the app, generated, with its model. */
export const build = (): Built => {
  const root = copyApp();
  const generated = run(root, ["generate"]);
  expect(generated.status, `ortho generate on examples/superagent:\n${generated.out}`).toBe(0);
  const m = run(root, ["model", "--json"]);
  expect(m.status, `ortho model --json on examples/superagent:\n${m.out}`).toBe(0);
  const docs = (rel: string) => read(root, join("generated/docs", rel));
  const allDocs = filesUnder(root, "generated/docs").map((f) => read(root, f)).join("\n");
  return { root, model: JSON.parse(m.stdout) as Node, docs, allDocs, mcp: read(root, "generated/mcp/src/index.ts") };
};

/** `<cli> <args> --help` of the generated CLI, as a user runs it. */
export const cliHelp = (root: string, ...args: ReadonlyArray<string>) => {
  const r = spawnSync(process.execPath, [join(root, "generated/cli/src/main.ts"), ...args, "--help"], { cwd: root, encoding: "utf8", timeout: 120_000 });
  return { status: r.status, out: `${r.stdout}${r.stderr}` };
};

/** `ortho check` on a copy: the exit status and everything it printed. */
export const check = (root: string) => run(root, ["check"]);

/** A copy's `@orthograph/<name>` replaced by a copy of the plugin the check can edit: the project's own scope folder, then one link changed. */
export const swapPlugin = (root: string, name: string, change: (dir: string) => void) => {
  const scope = join(root, "node_modules/@orthograph");
  if (lstatSync(scope).isSymbolicLink()) {
    const shared = readdirSync(scope);
    const target = join(superagent, "node_modules/@orthograph");
    unlinkSync(scope);
    mkdirSync(scope);
    for (const entry of shared) symlinkSync(join(target, entry), join(scope, entry));
  }
  const link = join(scope, name);
  expect(existsSync(join(superagent, "node_modules/@orthograph", name)), `examples/superagent has no @orthograph/${name} linked in node_modules`).toBe(true);
  const original = realpathSync(join(superagent, "node_modules/@orthograph", name));
  const dir = join(root, "..", `plugin-${name}`);
  cpSync(original, dir, { recursive: true, filter: (from) => !from.split("/").includes("node_modules") });
  if (existsSync(join(original, "node_modules"))) symlinkSync(join(original, "node_modules"), join(dir, "node_modules"));
  unlinkSync(link);
  symlinkSync(dir, link);
  change(dir);
  return dir;
};

/** Make something once, on first use; a failure is kept and thrown to every later caller, so each test that needs it fails by its own name (a `beforeAll` that throws would be one failure for the whole file). */
export const lazy = <A>(make: () => A): (() => A) => {
  let made: { readonly value: A } | { readonly error: unknown } | undefined;
  return () => {
    if (made === undefined) { try { made = { value: make() }; } catch (error) { made = { error }; } }
    if ("error" in made) throw made.error;
    return made.value;
  };
};

/** An `allowed` list as a sorted set of its entries: the design lists each one exactly, so a wider list (an `anyone` among them) is not the same list. */
export const allowedSet = (allowed: unknown): ReadonlyArray<string> => ((allowed ?? []) as ReadonlyArray<unknown>).map((a) => JSON.stringify(a, Object.keys(a as object).sort())).sort();
export const entries = (...a: ReadonlyArray<object>): ReadonlyArray<string> => allowedSet(a);

/**
 * Every plugin the app holds, copied beside the project so one can be edited, and every `@orthograph/<plugin>` in the copy, in
 * the project's and in each plugin's own `node_modules`, pointing at the copies. `swapPlugin` swaps one, which leaves the others
 * importing the original (two identities of one file), and `ortho check` then refuses for that, whatever the edit: this keeps
 * the copy as consistent as the original, so a control that passes is possible.
 */
export const swapPlugins = (root: string, change: (dirs: Readonly<Record<string, string>>) => void) => {
  const held = join(superagent, "plugins");
  const names = readdirSync(held, { withFileTypes: true }).filter((e) => e.isDirectory() || e.isSymbolicLink()).map((e) => e.name);
  const copies: Record<string, string> = Object.fromEntries(names.map((n) => [n, join(root, "..", "plugins-copy", n)]));
  const originals = new Map(names.map((n) => [realpathSync(join(held, n)), n] as const));
  for (const n of names) cpSync(join(held, n), copies[n]!, { recursive: true, filter: (from) => !from.split("/").includes("node_modules") });
  for (const n of names) {
    const from = join(held, n);
    const to = copies[n]!;
    if (!existsSync(join(from, "node_modules"))) continue;
    mkdirSync(join(to, "node_modules/@orthograph"), { recursive: true });
    for (const entry of readdirSync(join(from, "node_modules"))) {
      if (entry === "@orthograph" || entry === ".bin") continue;
      symlinkSync(realpathSync(join(from, "node_modules", entry)), join(to, "node_modules", entry));
    }
    if (existsSync(join(from, "node_modules/@orthograph"))) {
      for (const entry of readdirSync(join(from, "node_modules/@orthograph"))) {
        const real = realpathSync(join(from, "node_modules/@orthograph", entry));
        const plugin = originals.get(real);
        symlinkSync(plugin === undefined ? real : copies[plugin]!, join(to, "node_modules/@orthograph", entry));
      }
    }
  }
  const scope = join(root, "node_modules/@orthograph");
  if (lstatSync(scope).isSymbolicLink()) {
    const shared = readdirSync(scope);
    unlinkSync(scope);
    mkdirSync(scope);
    for (const entry of shared) symlinkSync(join(superagent, "node_modules/@orthograph", entry), join(scope, entry));
  }
  for (const n of names) {
    if (existsSync(join(scope, n))) unlinkSync(join(scope, n));
    symlinkSync(copies[n]!, join(scope, n));
  }
  change(copies);
  return copies;
};
