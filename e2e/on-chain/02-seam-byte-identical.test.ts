// Goal 4's done check, third line (`design/goals/04-on-chain.md`, "The done check": acme's and Plugged In's generated files are unchanged by
// the seam). Written by the checks author; a builder never edits this file (AGENTS.md, "Journeys and checks come first").
//
// WHAT IS REQUIRED. The yardstick is Goal 3's output, never this branch's own: the checked-in `generated/` of acme and of Plugged In at
// `git merge-base HEAD origin/goal/stage-1` (CI fetches the whole history). For each example,
// - the `generated/` checked in on this branch is that, byte for byte, the same files, none more, none fewer;
// - in a copy of the whole example (but node_modules) with `generated/` removed, the real `ortho generate` writes that again;
// - and generate changed nothing outside `generated/` in the copy (every other file the same before and after: none added, removed or edited).
// A generator changed and both examples regenerated and committed, a file dropped or added on both sides, or a write outside generated/ all
// fail. It passes today and must keep passing.
//
// THE CONTROLS plant each hollow reading against `treeProblems` and `mapProblems`: one byte changed, a line added to every file (a generator
// that changed and was regenerated into both sides), a file missing, a file added (on both sides), an empty folder on either side, a trailing
// newline, and a write outside generated/ (a file added, removed or edited).
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { fileMap, mapProblems, seamProblems, treeProblems } from "./seam.ts";

describe("controls: treeProblems and mapProblems refuse each hollow reading", () => {
  const dir = mkdtempSync(join(tmpdir(), "ortho-on-chain-tree-"));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));
  const make = (name: string, files: Record<string, string>) => {
    mkdirSync(join(dir, name), { recursive: true });
    for (const [f, text] of Object.entries(files)) { const p = join(dir, name, f); mkdirSync(join(p, ".."), { recursive: true }); writeFileSync(p, text); }
    return join(dir, name);
  };
  const base = { "a.ts": "one\n", "docs/b.md": "two\n", "model/edges.json": "{}\n" };
  const goal3 = () => make("goal3", base);
  it("accepts the same tree", () => expect(treeProblems(goal3(), make("same", base))).toEqual([]));
  it("refuses one byte changed, a trailing newline lost, a file missing and a file added", () => {
    expect(treeProblems(goal3(), make("byte", { ...base, "a.ts": "onf\n" }))).toEqual(["a.ts differs"]);
    expect(treeProblems(goal3(), make("nl", { ...base, "a.ts": "one" }))).toEqual(["a.ts differs"]);
    expect(treeProblems(goal3(), make("less", { "a.ts": "one\n", "docs/b.md": "two\n" }))).toHaveLength(1);
    expect(treeProblems(goal3(), make("more", { ...base, "c.ts": "" }))).toHaveLength(1);
  });
  it("refuses a generator that changed and was regenerated everywhere: a line added to every .ts, a file dropped, a file added, each against Goal 3's", () => {
    expect(treeProblems(goal3(), make("lines", { ...base, "a.ts": "one\n// new\n" }))).toEqual(["a.ts differs"]);
    expect(treeProblems(goal3(), make("edges", { "a.ts": "one\n", "docs/b.md": "two\n" }))).toEqual(["model/edges.json is in the expected tree but not in the actual tree"]);
    expect(treeProblems(goal3(), make("extra", { ...base, "new.ts": "x\n" }))).toEqual(["new.ts is in the actual tree but not in the expected tree"]);
  });
  it("refuses an empty folder on either side", () => {
    expect(treeProblems(make("empty", {}), make("empty2", {})).length).toBeGreaterThan(0);
    expect(treeProblems(goal3(), join(dir, "nowhere"))).not.toEqual([]);
    expect(treeProblems(join(dir, "nowhere"), goal3())).not.toEqual([]);
  });
  it("refuses a write outside generated/: a file added, one removed, one edited", () => {
    const before = fileMap(make("ex-before", { "src/a.ts": "a\n", "blueprint/b.ts": "b\n" }));
    expect(mapProblems(before, fileMap(make("ex-same", { "src/a.ts": "a\n", "blueprint/b.ts": "b\n" })), "before", "after")).toEqual([]);
    expect(mapProblems(before, fileMap(make("ex-add", { "src/a.ts": "a\n", "blueprint/b.ts": "b\n", "src/new.ts": "" })), "before", "after")).toHaveLength(1);
    expect(mapProblems(before, fileMap(make("ex-rm", { "src/a.ts": "a\n" })), "before", "after")).toHaveLength(1);
    expect(mapProblems(before, fileMap(make("ex-edit", { "src/a.ts": "a\n// scaffold\n", "blueprint/b.ts": "b\n" })), "before", "after")).toEqual(["src/a.ts differs"]);
  });
});

describe("regenerating changes nothing against Goal 3, and writes nothing outside generated/", () => {
  it("examples/acme", { timeout: 300_000 }, () => {
    const problems = seamProblems("acme");
    expect(problems, problems.join("\n")).toEqual([]);
  });
  it("examples/plugged-in", { timeout: 300_000 }, () => {
    const problems = seamProblems("plugged-in");
    expect(problems, problems.join("\n")).toEqual([]);
  });
});
