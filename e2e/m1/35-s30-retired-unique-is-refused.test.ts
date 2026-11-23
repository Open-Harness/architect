// Check 35 (S-30, `design/goals/03-snags.md`): the compiler refuses G4's retired `unique` property on a thing, in words. ST1.20 removed `unique` from
// `Blueprint.thing`'s types, so a typed project is refused by tsc. A project that skips typecheck, ignores the error (`// @ts-ignore`) or writes the thing
// in plain JavaScript still reaches the compiler, and there the rule was dropped without a word: `ortho model` and `ortho generate` exited 0, the model
// carried no rule and the migration no index, and two rows could hold one value. Meaning was lost silently.
// Written by the checks author; a builder never edits this file (AGENTS.md, "Journeys and checks come first").
//
// WHAT IS REQUIRED. In a throwaway copy of `examples/plugged-in` whose thing carries `unique: { <field>: { while: [...] } }`:
//   - `ortho model` and `ortho generate` exit non-zero (a failed compile that says why);
//   - what they print names the thing, says `unique` (the thing and `unique` on one line), and points at `invariants.ts` or `Blueprint.invariant.unique` (G5);
//   - nothing is written: every file of the copy is byte for byte what it was. For generate the copy's `generated/` is removed first, so a compiler that
//     went on would write it again, and the check then finds it still absent. The copy's folders are read-only while the command runs (so writing
//     then deleting fails too), and the refusal must not be a permission error. Dot-files count; only node_modules is left out;
//   - `generate` is run again, unlocked, on a fresh copy: non-zero and `generated/` still absent (a `generate` that warns and writes exits 0 here;
//     under the lock it fails for EACCES whatever it says). `model` writes nothing even when it succeeds, so the lock run already judges it;
//   - no output line pairs `unique` with a thing that does not carry it (a message listing every thing is not naming the thing).
// Where the property is caught (in `Blueprint.thing`, in the loader, in the compiler) is the builder's choice; this check reads only the command line.
// Variants: the property on handle and on profile (the thing's name is not hard-coded), behind `// @ts-ignore`; and handle declared in a plain `.js` file
// that the blueprint's `thing.ts` re-exports (the compiler walks only `.ts` blueprint files, so a `.js` one is reached by import); a spec built in
// `blueprint/values/retired.ts` and spread into handle (a scan of `blueprint/things` never sees it); a computed key, `[["uni", "que"].join("")]`
// (no text scan sees the word). Only a check on the thing the loader built passes these.
// Controls, true today: an intact copy compiles (model exit 0; generate into a removed `generated/` writes the committed one back); a thing with a FIELD
// named `unique` is not the retired property and compiles; the message reader knows a good message from a hollow one. Not passable hollow: a compiler
// that refuses everything fails the controls; a message with no thing, no `unique` or no pointer fails the reader.
import { createHash } from "node:crypto";
import { chmodSync, existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { copyOf, ortho } from "../layer1/support.ts";
import { repo } from "./support.ts";

const example = join(repo, "examples/plugged-in");
const copies: Array<ReturnType<typeof copyOf>> = [];
const folders = (root: string) => [root, ...readdirSync(root, { recursive: true, withFileTypes: true }).filter((d) => d.isDirectory() && !join(d.parentPath, d.name).startsWith(join(root, "node_modules"))).map((d) => join(d.parentPath, d.name))];
const lock = (root: string, mode: number) => { for (const dir of folders(root)) chmodSync(dir, mode); };
afterEach(() => { for (const copy of copies.splice(0)) { try { lock(copy.root, 0o755); } catch { /* removed */ } copy.remove(); } });
const fresh = () => { const copy = copyOf(example); copies.push(copy); return copy.root; };
const edit = (root: string, file: string, change: (text: string) => string) => { const path = join(root, file); writeFileSync(path, change(readFileSync(path, "utf8"))); };

const HANDLE = "blueprint/things/handle/thing.ts";
const PROFILE = "blueprint/things/profile/thing.ts";
const LINK = "blueprint/things/link/thing.ts";
const THINGS = readdirSync(join(example, "blueprint/things"), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
const RETIRED = (field: string) => `  // @ts-ignore: G4's retired property, as a project that skips typecheck would carry it\n  unique: { ${field}: { while: ["claimed"] } },\n`;

/** Every file of a folder but node_modules (dot-files and dot-folders included), by path, with a digest: what "nothing is written" is judged against. */
const tree = (root: string): Readonly<Record<string, string>> =>
  Object.fromEntries(readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((d) => d.isFile()).map((d) => join(d.parentPath, d.name).slice(root.length + 1))
    .filter((p) => !p.startsWith("node_modules/")).sort()
    .map((p) => [p, createHash("sha256").update(readFileSync(join(root, p))).digest("hex")]));

interface Way { readonly thing: string; readonly prepare: (root: string) => void }
const ways: Readonly<Record<string, Way>> = {
  "a `// @ts-ignore`d `unique` on handle": { thing: "handle", prepare: (root) => edit(root, HANDLE, (t) => t.replace('  code: "HN",\n', `  code: "HN",\n${RETIRED("name")}`)) },
  "a `// @ts-ignore`d `unique` on profile (the thing's name is not hard-coded)": { thing: "profile", prepare: (root) => edit(root, PROFILE, (t) => t.replace('  code: "PR",\n', `  code: "PR",\n${RETIRED("handle")}`)) },
  "a one-line quoted `\"unique\"` as the last key of link, a third thing": { thing: "link", prepare: (root) => edit(root, "blueprint/things/link/thing.ts", (t) => t.replace(/\n  \},\n\}\);\n$/, '\n  },\n  // @ts-ignore\n  "unique": { url: { while: ["listed"] } } });\n')) },
  "a spec built in blueprint/values/retired.ts and spread into handle": {
    thing: "handle",
    prepare: (root) => {
      writeFileSync(join(root, "blueprint/values/retired.ts"), 'export const retired = { unique: { name: { while: ["claimed"] } } };\n');
      edit(root, HANDLE, (t) => t.replace('import { HandleName }', 'import { retired } from "../../values/retired.ts";\nimport { HandleName }').replace("Blueprint.thing({", "Blueprint.thing({\n  ...retired,"));
    },
  },
  'a computed key, [["uni", "que"].join("")], on link': { thing: "link", prepare: (root) => edit(root, LINK, (t) => t.replace("Blueprint.thing({", 'Blueprint.thing({\n  // @ts-ignore\n  [["uni", "que"].join("")]: { url: { while: ["listed"] } },')) },
  "`unique` smuggled in through a spread on profile": { thing: "profile", prepare: (root) => edit(root, PROFILE, (t) => t.replace("Blueprint.thing({", 'Blueprint.thing({ ...({ unique: { handle: {} } } as object),')) },
  "handle declared in a plain .js file that thing.ts re-exports": {
    thing: "handle",
    prepare: (root) => {
      const js = readFileSync(join(root, HANDLE), "utf8").replace('  code: "HN",\n', '  code: "HN",\n  unique: { name: { while: ["claimed"] } },\n');
      writeFileSync(join(root, "blueprint/things/handle/thing.impl.js"), js);
      writeFileSync(join(root, HANDLE), 'export { Handle } from "./thing.impl.js";\n');
    },
  },
};

/** What a refusal must say: a line with the thing and `unique`, a pointer to where the rule goes now, and no line pairing `unique` with a thing that
 *  does not carry it (so a message listing every thing does not pass). Meaning, not wording. */
const RETIRED_WORD = /(?<!invariant\.)\bunique\b/i;
const says = (out: string, thing: string, all: ReadonlyArray<string> = THINGS) => ({
  names: out.split("\n").some((line) => new RegExp(`\\b${thing}\\b`, "i").test(line) && RETIRED_WORD.test(line)),
  points: /invariants\.ts|Blueprint\.invariant\.unique/.test(out),
  strays: out.split("\n").some((line) => RETIRED_WORD.test(line) && all.some((other) => other !== thing && new RegExp(`\\b${other}\\b`, "i").test(line))),
});
/** What a refusal is never: the operating system's answer to a write, standing in for one. */
const PERMISSION = /EACCES|EPERM|permission denied/i;

describe("35 controls: the message reader and an intact copy", () => {
  it("the reader knows a good message from a hollow one", () => {
    const good = "thing handle declares `unique`, which is retired: declare it with Blueprint.invariant.unique in blueprint/things/handle/invariants.ts";
    const ok = { names: true, points: true, strays: false };
    expect(says(good, "handle")).toEqual(ok);
    expect(says(good, "profile").names, "it names another thing").toBe(false);
    expect(says("thing handle: unique is retired; use Blueprint.invariant.unique", "handle")).toEqual(ok);
    expect(says("the blueprint failed to compile", "handle")).toEqual({ names: false, points: false, strays: false });
    expect(says("handle: unique is retired", "handle")).toEqual({ names: true, points: false, strays: false });
    expect(says("a thing declares unique: see invariants.ts", "handle")).toEqual({ names: false, points: true, strays: false });
    expect(says("handle is fine\nunique rows are fine\nsee invariants.ts", "handle").names, "the thing and `unique` on different lines").toBe(false);
    expect(says("can't load blueprint/things/handle/invariants.ts: Blueprint.invariant.unique is not a function", "handle"), "an unrelated failure on a handle file").toEqual({ names: false, points: true, strays: false });
    expect(says("", "handle")).toEqual({ names: false, points: false, strays: false });
    const listsAll = "a thing declares unique, which is retired (things: handle, link, profile): use Blueprint.invariant.unique in its invariants.ts";
    expect(says(listsAll, "handle"), "a message listing every thing names the thing and strays onto the others").toEqual({ names: true, points: true, strays: true });
    expect(says("thing handle declares unique, retired: see invariants.ts\nthing profile declares unique, retired", "handle").strays, "one line per thing, one of them wrong").toBe(true);
    expect(says("thing handle declares unique, retired: use Blueprint.invariant.unique in blueprint/things/handle/invariants.ts\nthing profile is fine", "handle").strays, "another thing on a line without `unique`").toBe(false);
  });

  it("an intact copy of Plugged In compiles: `ortho model` exits 0 and shows handle", () => {
    const model = ortho(fresh(), "model");
    expect(model.status, model.stderr).toBe(0);
    expect(model.stdout).toMatch(/^thing handle /m);
  });

  it("`ortho generate` in an intact copy whose generated/ was removed exits 0 and writes the committed generated/ back (so 'nothing written' below can fail)", () => {
    const root = fresh();
    const committed = tree(join(root, "generated"));
    expect(Object.keys(committed)).toContain("model/model.json");
    rmSync(join(root, "generated"), { recursive: true });
    const generate = ortho(root, "generate");
    expect(generate.status, generate.stderr).toBe(0);
    expect(tree(join(root, "generated"))).toEqual(committed);
  });

  it("the shape `unique: {` in a comment and in a description is not the retired property: it compiles", () => {
    const root = fresh();
    edit(root, HANDLE, (t) => t.replace('  code: "HN",\n', '  code: "HN",\n  // unique: { name: { while: ["claimed"] } } was G4\'s spelling\n').replace("A public name", "A public name (unique: { x: 1 } is retired)"));
    const model = ortho(root, "model");
    expect(model.status, model.stderr + model.stdout).toBe(0);
    expect(model.stdout).toMatch(/^thing handle /m);
  });

  it("a thing with a FIELD called unique is not the retired property: it compiles", () => {
    const root = fresh();
    edit(root, HANDLE, (t) => t.replace("    owner:", '    unique: Blueprint.described(Blueprint.id("per"), "A field that happens to be called unique."),\n    owner:'));
    const model = ortho(root, "model");
    expect(model.status, model.stderr + model.stdout).toBe(0);
    expect(model.stdout).toMatch(/^thing handle /m);
  });
});

describe.each(Object.entries(ways))("35: %s is refused, in words, and nothing is written", (_way, { thing, prepare }) => {
  it("`ortho model` exits non-zero, naming the thing and the retired `unique` and pointing at Blueprint.invariant.unique or invariants.ts; no file changes", () => {
    const root = fresh();
    prepare(root);
    const before = tree(root);
    lock(root, 0o555);
    const model = ortho(root, "model");
    const out = `${model.stdout}\n${model.stderr}`;
    expect(model.status, `compiled with exit 0 and said: ${JSON.stringify(out.slice(0, 200))}`).not.toBe(0);
    expect(says(out, thing).names, `no line names ${thing} with unique:\n${out.slice(0, 600)}`).toBe(true);
    expect(says(out, thing).points, `no pointer to invariants.ts or Blueprint.invariant.unique:\n${out.slice(0, 600)}`).toBe(true);
    expect(says(out, thing).strays, `a line pairs unique with a thing that does not carry it:\n${out.slice(0, 600)}`).toBe(false);
    expect(out, "the refusal is a permission error from the read-only copy").not.toMatch(PERMISSION);
    expect(tree(root)).toEqual(before);
  });

  it("`ortho generate` exits non-zero with the same words and writes nothing (generated/ was removed first and stays gone)", () => {
    const root = fresh();
    prepare(root);
    rmSync(join(root, "generated"), { recursive: true });
    const before = tree(root);
    lock(root, 0o555); // a refusal needs no write: a compiler that writes (and deletes after) meets a read-only folder
    const generate = ortho(root, "generate");
    const out = `${generate.stdout}\n${generate.stderr}`;
    expect(generate.status, `generated with exit 0 and said: ${JSON.stringify(out.slice(0, 200))}`).not.toBe(0);
    expect(says(out, thing).names, `no line names ${thing} with unique:\n${out.slice(0, 600)}`).toBe(true);
    expect(says(out, thing).points, `no pointer to invariants.ts or Blueprint.invariant.unique:\n${out.slice(0, 600)}`).toBe(true);
    expect(says(out, thing).strays, `a line pairs unique with a thing that does not carry it:\n${out.slice(0, 600)}`).toBe(false);
    expect(out, "the refusal is a permission error from the read-only copy").not.toMatch(PERMISSION);
    expect(existsSync(join(root, "generated")), "generated/ was written").toBe(false);
    expect(tree(root)).toEqual(before);
  });

  it("`ortho generate` on a fresh, writable copy exits non-zero and leaves generated/ absent (a generate that warns and writes exits 0 here)", () => {
    const root = fresh();
    prepare(root);
    rmSync(join(root, "generated"), { recursive: true });
    const before = tree(root);
    const generate = ortho(root, "generate");
    const out = `${generate.stdout}\n${generate.stderr}`;
    expect(generate.status, `generated with exit 0 and said: ${JSON.stringify(out.slice(0, 200))}`).not.toBe(0);
    expect(says(out, thing).names, `no line names ${thing} with unique:\n${out.slice(0, 600)}`).toBe(true);
    expect(says(out, thing).points, `no pointer to invariants.ts or Blueprint.invariant.unique:\n${out.slice(0, 600)}`).toBe(true);
    expect(says(out, thing).strays, `a line pairs unique with a thing that does not carry it:\n${out.slice(0, 600)}`).toBe(false);
    expect(existsSync(join(root, "generated")), "generated/ was written").toBe(false);
    expect(tree(root)).toEqual(before);
  });
});
