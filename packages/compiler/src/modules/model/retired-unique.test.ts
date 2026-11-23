// S-30 (design/goals/03-snags.md), the package half of e2e check 35: the compiler refuses G4's retired `unique` property on a thing, naming the thing and
// pointing at `Blueprint.invariant.unique` in `invariants.ts` (G5), instead of dropping the rule without a word. Reached by a project that skips typecheck,
// ignores the error with `// @ts-ignore`, or writes a thing in plain JavaScript. Where it is caught (`Blueprint.thing`, the loader, the compiler) is the
// builder's choice: this reads only what `Compiler.model` returns. A separate file from invariants.test.ts, which another checks author is changing.
// Written by the checks author; a builder never edits this file (AGENTS.md, "Journeys and checks come first").
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { Cause, Effect, Exit } from "effect";
import { afterAll, describe, expect, it } from "vitest";
import { nodeSource } from "#modules/source/service.js";
import { Compiler } from "./service.ts";

const visible = (from: string) => !basename(from).startsWith(".");
const pluggedIn = resolve(import.meta.dirname, "../../../../../examples/plugged-in");
const scratch = resolve(import.meta.dirname, "../../../test/tmp/retired-unique");
const modelOf = (root: string) => Effect.runPromiseExit(Effect.provide(Compiler.model, nodeSource(root)));
/** A copy of Plugged In's blueprint inside the package, so its imports still resolve. */
const copy = (): string => {
  mkdirSync(scratch, { recursive: true });
  const root = mkdtempSync(join(scratch, "plugged-in-"));
  cpSync(join(pluggedIn, "blueprint"), join(root, "blueprint"), { recursive: true, filter: (path) => visible(path) && basename(path) !== "projections" });
  return root;
};
const HANDLE = "blueprint/things/handle/thing.ts";
const edit = (root: string, file: string, change: (text: string) => string) => { const path = join(root, file); writeFileSync(path, change(readFileSync(path, "utf8"))); };
/** What a failed model says, as lines: the typed failure's problems or message, and the cause as printed. Never a JSON dump of the whole cause. */
const said = (exit: Exit.Exit<unknown, unknown>): string => {
  if (!Exit.isFailure(exit)) return "";
  const own = exit.cause.reasons.filter(Cause.isFailReason).map((r) => r.error).flatMap((e) => {
    const f = e as { readonly problems?: ReadonlyArray<string>; readonly message?: string };
    return [...(f.problems ?? []), ...(typeof f.message === "string" ? [f.message] : [])];
  });
  return [...own, Cause.pretty(exit.cause)].join("\n");
};
const THINGS = readdirSync(join(pluggedIn, "blueprint/things"), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
const RETIRED_WORD = /(?<!invariant\.)\bunique\b/i;
/** A line with the thing and `unique`, a pointer to where the rule goes now, and no line pairing `unique` with a thing that does not carry it. */
const meaning = (text: string, thing: string) => ({
  thing: text.split("\n").some((line) => new RegExp(`\\b${thing}\\b`, "i").test(line) && RETIRED_WORD.test(line)),
  pointer: /invariants\.ts|Blueprint\.invariant\.unique/.test(text),
  strays: text.split("\n").some((line) => RETIRED_WORD.test(line) && THINGS.some((other) => other !== thing && new RegExp(`\\b${other}\\b`, "i").test(line))),
});

describe("retired unique: controls", () => {
  afterAll(() => rmSync(scratch, { recursive: true, force: true }));
  it("an intact Plugged In models, with handle among its things", async () => {
    const exit = await modelOf(copy());
    expect(Exit.isSuccess(exit), said(exit)).toBe(true);
    if (Exit.isSuccess(exit)) expect(Object.keys(exit.value.things)).toContain("handle");
  });
  it("the reader tells a good refusal from a hollow one", () => {
    expect(meaning("thing handle declares unique: use Blueprint.invariant.unique", "handle")).toEqual({ thing: true, pointer: true, strays: false });
    expect(meaning("compile failed", "handle")).toEqual({ thing: false, pointer: false, strays: false });
    expect(meaning("thing handle is retired", "handle")).toEqual({ thing: false, pointer: false, strays: false });
    expect(meaning("unique is retired, see invariants.ts", "handle")).toEqual({ thing: false, pointer: true, strays: false });
    expect(meaning("can't load blueprint/things/handle/invariants.ts: Blueprint.invariant.unique is not a function", "handle"), "an unrelated failure on a handle file").toEqual({ thing: false, pointer: true, strays: false });
    expect(meaning("thing handle declares unique: use Blueprint.invariant.unique", "profile").thing, "another thing").toBe(false);
    expect(meaning("a thing declares unique, which is retired (things: handle, link, profile): use Blueprint.invariant.unique in its invariants.ts", "handle"), "a message listing every thing").toEqual({ thing: true, pointer: true, strays: true });
  });
});

const ways: Readonly<Record<string, { readonly thing: string; readonly prepare: (root: string) => void }>> = {
  "a `// @ts-ignore`d `unique` on handle": { thing: "handle", prepare: (root) => edit(root, HANDLE, (t) => t.replace('  code: "HN",\n', '  code: "HN",\n  // @ts-ignore\n  unique: { name: { while: ["claimed"] } },\n')) },
  "a `// @ts-ignore`d `unique` on profile": { thing: "profile", prepare: (root) => edit(root, "blueprint/things/profile/thing.ts", (t) => t.replace('  code: "PR",\n', '  code: "PR",\n  // @ts-ignore\n  unique: { handle: { while: ["claimed"] } },\n')) },
  "a spec built in blueprint/values/retired.ts and spread into handle": {
    thing: "handle",
    prepare: (root) => {
      writeFileSync(join(root, "blueprint/values/retired.ts"), 'export const retired = { unique: { name: { while: ["claimed"] } } };\n');
      edit(root, HANDLE, (t) => t.replace('import { HandleName }', 'import { retired } from "../../values/retired.ts";\nimport { HandleName }').replace("Blueprint.thing({", "Blueprint.thing({\n  ...retired,"));
    },
  },
  'a computed key, [["uni", "que"].join("")], on link': { thing: "link", prepare: (root) => edit(root, "blueprint/things/link/thing.ts", (t) => t.replace("Blueprint.thing({", 'Blueprint.thing({\n  // @ts-ignore\n  [["uni", "que"].join("")]: { url: { while: ["listed"] } },')) },
  "handle declared in a plain .js file that thing.ts re-exports": {
    thing: "handle",
    prepare: (root) => {
      const js = readFileSync(join(root, HANDLE), "utf8").replace('  code: "HN",\n', '  code: "HN",\n  unique: { name: { while: ["claimed"] } },\n');
      writeFileSync(join(root, "blueprint/things/handle/thing.impl.js"), js);
      writeFileSync(join(root, HANDLE), 'export { Handle } from "./thing.impl.js";\n');
    },
  },
};

describe.each(Object.entries(ways))("retired unique: %s is refused", (_way, { thing, prepare }) => {
  afterAll(() => rmSync(scratch, { recursive: true, force: true }));
  it(`fails the model, naming ${"the thing"} with unique on one line and pointing at invariants.ts / Blueprint.invariant.unique`, async () => {
    const root = copy();
    prepare(root);
    const exit = await modelOf(root);
    expect(Exit.isFailure(exit), "the model was made, and the rule dropped").toBe(true);
    expect(meaning(said(exit), thing), said(exit).slice(0, 500)).toEqual({ thing: true, pointer: true, strays: false });
  });
});
