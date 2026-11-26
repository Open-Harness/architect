// What every from-doctype check shares (design/decisions/CX-from-doctype.md): a copy of examples/starter with an asset
// laid over it, `ortho add thing --from-doctype` run as a user runs it, the model read back, and the blanks filled.
import { createHash } from "node:crypto";
import { cpSync, existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { expect } from "vitest";
import { copyOf, ortho, repo } from "../layer1/support.ts";

export { nothingRunning } from "../layer1/support.ts";

export const starter = join(repo, "examples/starter");
export const fixtures = join(repo, "e2e/fixtures/from-doctype");
/** A doctype in the flat folder: `doctypes/<snake>.json`, its tables beside it. */
export const doctype = (snake: string) => join(fixtures, "doctypes", `${snake}.json`);
/** A doctype in ERPNext's own layout: `erpnext-layout/<snake>/<snake>.json`, each table in a folder of its own. */
export const nested = (snake: string) => join(fixtures, "erpnext-layout", snake, `${snake}.json`);

const copies: Array<ReturnType<typeof copyOf>> = [];
/** examples/starter copied, with `fixtures/from-doctype/project` (the `usdc` asset) laid over it. */
export const project = () => {
  const copy = copyOf(starter);
  cpSync(join(fixtures, "project"), copy.root, { recursive: true });
  copies.push(copy);
  return copy.root;
};
/** Remove every copy made; each file calls it in its `afterAll`. */
export const cleanup = () => {
  for (const copy of copies.splice(0)) copy.remove();
};

/** Memoised: the first call runs it, later calls get the same answer, so each test reads one scaffold. */
export const once = <T>(make: () => T): (() => T) => {
  let made: { readonly value: T } | undefined;
  return () => (made ??= { value: make() }).value;
};

export interface Ran {
  readonly status: number | null;
  readonly out: string;
}

/** `ortho add thing --from-doctype <file> [flags]` in the project, as a user runs it. */
export const scaffold = (root: string, file: string, ...flags: ReadonlyArray<string>): Ran => {
  const run = ortho(root, "add", "thing", "--from-doctype", file, ...flags);
  return { status: run.status, out: run.stdout + run.stderr };
};

/** The same, which must succeed. */
export const scaffolds = (root: string, file: string, ...flags: ReadonlyArray<string>): Ran => {
  const ran = scaffold(root, file, ...flags);
  expect(ran.status, `ortho add thing --from-doctype ${basename(file)} ${flags.join(" ")} should exit 0:\n${ran.out}`).toBe(0);
  return ran;
};

/** The same, which must be refused: exit 2, every word in `names` in what it printed, and not one file changed. */
export const refused = (root: string, names: ReadonlyArray<string>, file: string, ...flags: ReadonlyArray<string>): Ran => {
  const before = { ...digest(root, "blueprint"), ...digest(root, "src") };
  const ran = scaffold(root, file, ...flags);
  expect(ran.status, `ortho add thing --from-doctype ${basename(file)} ${flags.join(" ")} should be refused with exit 2:\n${ran.out}`).toBe(2);
  for (const name of names) expect(ran.out, `the refusal should name ${JSON.stringify(name)}`).toContain(name);
  expect({ ...digest(root, "blueprint"), ...digest(root, "src") }, "a refusal writes nothing").toEqual(before);
  return ran;
};

/** `ortho generate`, which must succeed. */
export const generated = (root: string) => {
  const run = ortho(root, "generate");
  expect(run.status, `ortho generate failed:\n${run.stdout}${run.stderr}`).toBe(0);
};

/** `ortho check`: its exit and its lines. */
export const checked = (root: string): Ran & { readonly lines: ReadonlyArray<string> } => {
  const run = ortho(root, "check");
  return { status: run.status, out: run.stdout + run.stderr, lines: run.stdout.split("\n") };
};

// The parts of `ortho model --json` these checks read.
export interface ValueJson {
  readonly type: string;
  readonly [key: string]: unknown;
}
export interface FieldJson {
  readonly value: ValueJson;
  readonly optional?: boolean;
  readonly ref?: string;
  readonly named?: string;
  readonly description?: string;
}
export interface MoveJson {
  readonly from: ReadonlyArray<string>;
  readonly to: ReadonlyArray<string>;
  readonly emits: string;
}
export interface ThingJson {
  readonly name: string;
  readonly identifier: string;
  readonly code: string;
  readonly description: string;
  readonly fields: Readonly<Record<string, FieldJson>>;
  readonly lives: string;
  readonly machine: { readonly states: ReadonlyArray<string>; readonly moves: Readonly<Record<string, MoveJson>>; readonly notFrom: { readonly exit: number } } | null;
  readonly events: Readonly<Record<string, Readonly<Record<string, FieldJson>>>>;
  readonly roles: ReadonlyArray<unknown>;
}
export interface OperationJson {
  readonly kind: "operation" | "read";
  readonly payload: Readonly<Record<string, FieldJson>>;
  readonly answer: Readonly<Record<string, FieldJson>>;
  readonly move: ({ readonly key: string } & MoveJson) | null;
  readonly steps: Readonly<Record<string, { readonly type: string; readonly writes?: ReadonlyArray<string> }>>;
  readonly allowed: ReadonlyArray<{ readonly kind: string }>;
}
export interface ModelJson {
  readonly things: Readonly<Record<string, ThingJson>>;
  readonly operations: Readonly<Record<string, OperationJson>>;
  readonly blankOperations?: Readonly<Record<string, { readonly kind: string; readonly blanks: ReadonlyArray<string> }>>;
  readonly blanks?: Readonly<Record<string, ReadonlyArray<string>>>;
}

/** `ortho model --json`, which must load. */
export const model = (root: string): ModelJson => {
  const run = ortho(root, "model", "--json");
  expect(run.status, `ortho model --json failed:\n${run.stdout}${run.stderr}`).toBe(0);
  return JSON.parse(run.stdout) as ModelJson;
};

/** The thing, which must be in the model. */
export const thingOf = (m: ModelJson, name: string): ThingJson => {
  const t = m.things[name];
  expect(t, `the model has no thing ${name}; it has ${Object.keys(m.things).join(", ")}`).toBeDefined();
  return t as ThingJson;
};

/** The operation or read, which must be in the model whole (its `allowed` filled). */
export const operationOf = (m: ModelJson, name: string): OperationJson => {
  const o = m.operations[name];
  expect(o, `the model has no operation ${name}; it has ${Object.keys(m.operations).filter((k) => k.startsWith(name.split(".")[0] ?? "")).join(", ")}`).toBeDefined();
  return o as OperationJson;
};

/** Each operation and read of these things, with the blanks the model names for it: every blank in the model under them. */
export const blanksOf = (m: ModelJson, things: ReadonlyArray<string>): Record<string, ReadonlyArray<string>> =>
  Object.fromEntries(Object.entries(m.blanks ?? {}).filter(([name]) => things.includes(name.slice(0, name.indexOf(".")))).sort(([a], [b]) => (a < b ? -1 : 1)));

/** The ERPNext roles a who-may-act blank names: each quoted, in order. */
export const rolesIn = (blank: string): ReadonlyArray<string> => [...blank.matchAll(/"([^"]+)"/g)].map((m) => m[1] ?? "");

/** The blank for one operation must be who may act and nothing else, naming exactly these ERPNext roles. */
export const whoMayAct = (blanks: ReadonlyArray<string> | undefined, verb: string, article: string, right: string, roles: ReadonlyArray<string>) => {
  expect(blanks, `no blank for ${verb}`).toBeDefined();
  expect(blanks?.length, `the only blank is who may ${verb}: ${JSON.stringify(blanks)}`).toBe(1);
  const blank = blanks?.[0] ?? "";
  const said = roles.length === 0 ? "to no role" : "to ";
  expect(blank.startsWith(`allowed: who may ${verb} ${article}: ERPNext gives ${right} ${said}`), blank).toBe(true);
  expect(rolesIn(blank), blank).toEqual(roles);
};

/**
 * Fill every who-may-act blank with `[Blueprint.signedIn]`, as a person filling them would, and say how many there were.
 * The decision writes each as `allowed: Blueprint.todo<never>("…")` on one line.
 */
export const fill = (root: string, things: ReadonlyArray<string>): number => {
  let filled = 0;
  for (const thing of things) {
    const dir = join(root, "blueprint/things", thing, "verbs");
    if (!existsSync(dir)) continue;
    for (const verb of readdirSync(dir)) {
      const path = join(dir, verb);
      const text = readFileSync(path, "utf8");
      const next = text.replace(/allowed: Blueprint\.todo<never>\("(?:[^"\\]|\\.)*"\)/g, () => (filled++, "allowed: [Blueprint.signedIn]"));
      writeFileSync(path, next);
    }
  }
  return filled;
};

/** Every file under `dir`, sorted, as paths from the project's root. */
export const tree = (root: string, dir: string): ReadonlyArray<string> =>
  existsSync(join(root, dir))
    ? readdirSync(join(root, dir), { withFileTypes: true }).flatMap((entry) => {
        const path = `${dir}/${entry.name}`;
        return entry.isDirectory() ? tree(root, path) : [path];
      }).sort()
    : [];

/** Every file under `dir` with a digest of its bytes: two are equal when the trees are byte for byte. */
export const digest = (root: string, dir: string): Record<string, string> =>
  Object.fromEntries(tree(root, dir).map((path) => [path, createHash("sha256").update(readFileSync(join(root, path))).digest("hex")]));

/** The files a step wrote: what is under blueprint/ and src/ now and wasn't before, or changed. */
export const written = (before: Record<string, string>, root: string): ReadonlyArray<string> => {
  const after = { ...digest(root, "blueprint"), ...digest(root, "src") };
  return Object.keys(after).filter((path) => before[path] !== after[path]).sort();
};
export const snapshot = (root: string): Record<string, string> => ({ ...digest(root, "blueprint"), ...digest(root, "src") });

/** The text of a file in the project. */
export const textAt = (root: string, path: string) => readFileSync(join(root, path), "utf8");

/** Every file written opens with the scaffold line, naming the doctype file and the doctype (AGENTS.md). */
export const headed = (root: string, paths: ReadonlyArray<string>, file: string, doctypeName: string) => {
  for (const path of paths) {
    const first = textAt(root, path).split("\n")[0];
    expect(first, path).toBe(`// Scaffolded from ${file}, ERPNext's ${doctypeName}. Yours from now on.`);
  }
};

/** The columns of one table in the generated server migration. */
export const columnsOf = (root: string, table: string): ReadonlyArray<string> => {
  const sql = textAt(root, "generated/server/migrations/0001_things.sql");
  const start = sql.indexOf(`CREATE TABLE "${table}" (\n`);
  expect(start, `no table ${table} in the migration`).toBeGreaterThanOrEqual(0);
  const body = sql.slice(start, sql.indexOf("\n);", start));
  return body.split("\n").slice(1).map((line) => /^\s*"([^"]+)"/.exec(line)?.[1] ?? line);
};
