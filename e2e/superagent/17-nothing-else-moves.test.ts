// Check 17 (Goal 17 slice 5): a blueprint without the superagent's plugins generates byte for byte as before. Each example the
// repository checks in with its `generated/` (acme, plugged-in, signup, starter, work) is copied without it, generated
// again, and every file compared with what is checked in: the same files, the same bytes. Slice 5 changes the compiler and
// the generators (new forms, a new model key or two); this is what says none of that touches an app that doesn't use them.
// It passes today and must keep passing. It is not about examples/superagent, whose output is new.
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { copyOf, ortho, repo } from "../layer1/support.ts";

const EXAMPLES = ["acme", "plugged-in", "signup", "starter", "work"] as const;

const filesIn = (dir: string): ReadonlyArray<string> =>
  readdirSync(dir, { recursive: true, withFileTypes: true }).filter((e) => e.isFile()).map((e) => join(e.parentPath, e.name).slice(dir.length + 1)).sort();

/** What differs between two folders: files only on one side, and files whose bytes differ. */
export const differences = (before: string, after: string): ReadonlyArray<string> => {
  const a = filesIn(before);
  const b = filesIn(after);
  return [
    ...a.filter((f) => !b.includes(f)).map((f) => `not regenerated: ${f}`),
    ...b.filter((f) => !a.includes(f)).map((f) => `new: ${f}`),
    ...a.filter((f) => b.includes(f) && !readFileSync(join(before, f)).equals(readFileSync(join(after, f)))).map((f) => `changed: ${f}`),
  ];
};

const scratch: Array<string> = [];
afterAll(() => { for (const d of scratch.splice(0)) rmSync(d, { recursive: true, force: true }); });

describe("17 the comparison is one that can fail", () => {
  it("sees a changed byte, a file that is gone and a file that is new", () => {
    const parent = mkdtempSync(join(tmpdir(), "ortho-17-"));
    scratch.push(parent);
    for (const side of ["a", "b"]) mkdirSync(join(parent, side, "sub"), { recursive: true });
    for (const [side, file, text] of [["a", "same.ts", "x"], ["b", "same.ts", "x"], ["a", "sub/changed.ts", "x"], ["b", "sub/changed.ts", "y"], ["a", "gone.ts", "x"], ["b", "new.ts", "x"]] as const) writeFileSync(join(parent, side, file), text);
    expect([...differences(join(parent, "a"), join(parent, "b"))].sort()).toEqual(["changed: sub/changed.ts", "new: new.ts", "not regenerated: gone.ts"]);
    writeFileSync(join(parent, "b", "sub/changed.ts"), "x");
    writeFileSync(join(parent, "b", "gone.ts"), "x");
    rmSync(join(parent, "b", "new.ts"));
    expect(differences(join(parent, "a"), join(parent, "b"))).toEqual([]);
  });
});

describe("17 a blueprint without the superagent's plugins generates byte for byte as before", () => {
  it.each(EXAMPLES)("%s: `ortho generate` on a copy without generated/ writes exactly the checked-in generated/", (name) => {
    const example = join(repo, "examples", name);
    expect(existsSync(join(example, "generated")), `examples/${name}/generated is checked in`).toBe(true);
    const parts = ["ortho.config.ts", "blueprint", "src", "journeys", "package.json"].filter((p) => existsSync(join(example, p)));
    const copy = copyOf(example, parts);
    try {
      const g = ortho(copy.root, "generate");
      expect(g.status, `ortho generate on ${name}:\n${g.stdout}${g.stderr}`).toBe(0);
      expect(differences(join(example, "generated"), join(copy.root, "generated"))).toEqual([]);
    } finally {
      copy.remove();
    }
  });
});
