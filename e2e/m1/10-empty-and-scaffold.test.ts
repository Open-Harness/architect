import { spawnSync } from "node:child_process";
import { copyFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { freePorts } from "../ports.ts";
import { copyOf, acme, fixtures, model, nothingRunning, removeAt, run, succeeds, textAt } from "./support.ts";

const PORTS = freePorts("changed", "unchanged", "empty", "scaffold");
const copies: Array<ReturnType<typeof copyOf>> = [];
const fresh = () => {
  const copy = copyOf(acme);
  copies.push(copy);
  return copy.root;
};
afterEach(() => { for (const copy of copies.splice(0)) copy.remove(); });

const revoke = "src/allowance/revoke.ts";
const spend = "src/allowance/spend.ts";
const edit = "blueprint/things/allowance/verbs/edit.ts";
const fixture = join(fixtures, "optional-edit");

const revokeThenSpend = (root: string, port: number) => {
  const result = run(root, "prove", "--empty", "--only", "revoke then spend", "--port", String(port));
  expect(result.out.match(/^journey .*$/gm), result.out).toEqual(["journey revoke then spend ✘ 1/3 steps"]);
  expect(result.status, result.out).toBe(1);
  expect([...result.out.matchAll(/^ +✘ "([^"\n]+)"/gm)].map((line) => line[1])).toEqual([
    "ada revokes it",
    "olga can't spend",
  ]);
  expect(result.out).toMatch(/✔ .*olga can't revoke it either.*proved by the description/);
  nothingRunning(root);
  return result.out;
};

describe("M1.16: ortho prove --empty", () => {
  it("runs acme's revoke then spend with two red steps and the role refusal proved by the description", () => {
    const root = fresh();
    const originals = [textAt(root, revoke), textAt(root, spend)];
    revokeThenSpend(root, PORTS.empty);
    expect([textAt(root, revoke), textAt(root, spend)]).toEqual(originals);
  });
});

describe("M1.26: the wired scaffold and optional steps", () => {
  it("compiles fresh scaffolds with ordered steps, refusal and move, and names the two reached blanks in prove", () => {
    const root = fresh();
    removeAt(root, revoke);
    removeAt(root, spend);
    succeeds(root, "generate");
    const typed = spawnSync(join(root, "node_modules/.bin/tsc"), ["--noEmit"], { cwd: root, encoding: "utf8" });
    expect(typed.status, typed.stdout + typed.stderr).toBe(0);

    const source = textAt(root, spend);
    expect(source).toMatch(/steps\.load\(Handlers\.blank[\s\S]*steps\.record\(Handlers\.blank[\s\S]*move\(/);
    expect(source).toMatch(/new AllowanceExceeded\(/);
    expect(textAt(root, revoke)).toMatch(/steps\.update\(Handlers\.blank/);
    const result = revokeThenSpend(root, PORTS.scaffold);
    expect(result).toMatch(/✘ "ada revokes it"[^\n]*BlankReached[^\n]*update/);
    expect(result).toMatch(/✘ "olga can't spend"[^\n]*BlankReached[^\n]*load/);
  });

  it("reports an optional save exercised only on the changed path, then passes eval 6 with an unchanged edit", () => {
    const root = fresh();
    for (const path of [edit, "src/allowance/edit.ts", "journeys/change-the-limit.ts"]) {
      copyFileSync(join(fixture, path), join(root, path));
    }
    succeeds(root, "generate");
    expect(model(root).operations["allowance.edit"]?.["steps"]).toMatchObject({ save: { optional: true } });

    const changed = succeeds(root, "prove", "--port", String(PORTS.changed)).out;
    expect(changed).toContain("journey change the limit ✔ 1/1 steps");
    const oneWay = /allowance\.edit\.save[^\n]*never exercised both ways|never exercised both ways[^\n]*allowance\.edit\.save/;
    expect(changed).toMatch(oneWay);
    nothingRunning(root);

    const unchanged = "journeys/keep-the-limit.ts";
    copyFileSync(join(fixture, unchanged), join(root, unchanged));
    const both = succeeds(root, "prove", "--port", String(PORTS.changed)).out;
    expect(both).toContain("journey keep the limit ✔ 1/1 steps");
    expect(both).toContain("allowance.edit steps ✔");
    expect(both).not.toMatch(oneWay);
    nothingRunning(root);
  });

  it("reports an optional save that only the unchanged path ran, as the same one-way gap", () => {
    const root = fresh();
    for (const path of [edit, "src/allowance/edit.ts", "journeys/keep-the-limit.ts"]) {
      copyFileSync(join(fixture, path), join(root, path));
    }
    succeeds(root, "generate");
    const unchanged = succeeds(root, "prove", "--port", String(PORTS.unchanged)).out;
    expect(unchanged).toContain("journey keep the limit ✔ 1/1 steps");
    expect(unchanged).toMatch(/allowance\.edit\.save[^\n]*never exercised both ways|never exercised both ways[^\n]*allowance\.edit\.save/);
    nothingRunning(root);
  });

  it("warns about nothing on acme as shipped, nor on an optional step the handler never calls", () => {
    const root = fresh();
    expect(succeeds(root, "check").out).not.toMatch(/\bwarning\b/i);
    for (const path of [edit, "src/allowance/edit.ts", "journeys/change-the-limit.ts"]) {
      copyFileSync(join(fixture, path), join(root, path));
    }
    const source = textAt(root, "src/allowance/edit.ts");
    const edited = source.replace("yield* steps.save(records.update(Allowance, allowance, { limit }))", "yield* records.update(Allowance, allowance, { limit })");
    expect(edited).not.toBe(source);
    writeFileSync(join(root, "src/allowance/edit.ts"), edited);
    succeeds(root, "generate");
    expect(succeeds(root, "check").out).not.toMatch(/\bwarning\b/i);
  });

  it("warns when spend updates the record without calling its required step", () => {
    const root = fresh();
    const source = textAt(root, spend);
    const edited = source.replace("steps.record(records.update(Allowance, allowance, { spent: spent + amount }))", "records.update(Allowance, allowance, { spent: spent + amount })");
    expect(edited).not.toBe(source);
    writeFileSync(join(root, spend), edited);
    const result = succeeds(root, "check").out;
    expect(result).toMatch(/\bwarning\b/i);
    expect(result).toMatch(/src\/allowance\/spend\.ts[^\n]*steps\.record|steps\.record[^\n]*src\/allowance\/spend\.ts/);
  });
});
