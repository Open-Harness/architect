// Which checks touch the served portal, found rather than listed (Goal 6, protocol point 3: a portal check that arrives by a merge from
// goal/stage-1 is owed to the new client automatically). A check file touches it when it, or a file it imports (through relative imports, any
// depth), opens a portal through `served-portal` or names `portal/dist/client`. The parity run (`vitest.parity.config.ts`) runs every such
// check but the exempt ones, against the new client; `parity.test.ts` fails when an exemption has no reason, no check, or is not needed.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

export const e2eRoot = resolve(import.meta.dirname, "../..");
const rootOf = (given?: string): string => given ?? e2eRoot;
/** What judges the instruments, or runs on its own list: never a portal check of the parity run. */
const SKIPPED = ["node_modules", "portal-next", "grid", "served-portal", "out"];
const TOUCHES = /served-portal|portal\/dist\/client|ServedPortals/;
const IMPORT = /from\s+"(\.{1,2}\/[^"]+)"/g;

const walk = (folder: string): ReadonlyArray<string> =>
  readdirSync(folder, { withFileTypes: true }).flatMap((e) => (SKIPPED.includes(e.name) ? [] : e.isDirectory() ? walk(join(folder, e.name)) : e.name.endsWith(".ts") ? [join(folder, e.name)] : []));

const importsOf = (file: string): ReadonlyArray<string> =>
  [...readFileSync(file, "utf8").matchAll(IMPORT)].map((m) => resolve(dirname(file), m[1] ?? "")).filter((p) => existsSync(p) && p.endsWith(".ts"));

/** Every check file (`*.test.ts` outside the skipped folders) that touches the served portal, by its path from `e2e/`, sorted. */
export const touchingChecks = (at?: string): ReadonlyArray<string> => {
  const files = walk(rootOf(at));
  const own = new Map(files.map((f) => [f, TOUCHES.test(readFileSync(f, "utf8"))]));
  const touches = (file: string, seen: ReadonlySet<string>): boolean =>
    (own.get(file) ?? TOUCHES.test(readFileSync(file, "utf8"))) || importsOf(file).some((i) => !seen.has(i) && touches(i, new Set([...seen, file])));
  return files.filter((f) => f.endsWith(".test.ts") && touches(f, new Set())).map((f) => relative(rootOf(at), f)).sort();
};

/** The checks that touch the portal and are not the new client's to pass yet, each with the reason: `exempt.json`, `{ "<path from e2e/>": "<why>" }`. */
export const exemptions = (): Readonly<Record<string, string>> =>
  JSON.parse(readFileSync(join(import.meta.dirname, "exempt.json"), "utf8")) as Record<string, string>;

/** What the parity run runs against the new client. */
export const parityChecks = (): ReadonlyArray<string> => {
  const exempt = exemptions();
  return touchingChecks().filter((c) => exempt[c] === undefined);
};
