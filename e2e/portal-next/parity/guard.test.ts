// Goal 6, slice 2: the guard on what the parity run owes. A portal check that arrives by a merge from goal/stage-1 is owed to the new client
// automatically (the goal's protocol, point 3), so the run is not a list of files: it is every check that touches the served portal, found
// by `touching.ts`, less the exemptions of `exempt.json`, each with its reason. These tests judge the finder on a planted tree, the
// exemptions, and the grid's portal list. Controls and guards: they pass today and fail when a check goes missing from the run unexplained.
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { e2eRoot, exemptions, parityChecks, touchingChecks } from "./touching.ts";

const dirs: Array<string> = [];
afterAll(() => { for (const d of dirs) rmSync(d, { recursive: true, force: true }); });
const tree = (files: Readonly<Record<string, string>>): string => {
  const dir = mkdtempSync(join(tmpdir(), "parity-guard-"));
  dirs.push(dir);
  for (const [path, text] of Object.entries(files)) { mkdirSync(join(dir, path, ".."), { recursive: true }); writeFileSync(join(dir, path), text); }
  return dir;
};

describe("the finder", () => {
  it("finds a check that opens a portal, one that does so through a helper, and one that reads the old client's files, and nothing else", () => {
    const dir = tree({
      "m1/50-direct.test.ts": 'import { ServedPortals } from "../served-portal/service.ts";\n',
      "m1/51-helper.test.ts": 'import { page } from "./helper.ts";\n',
      "m1/helper.ts": 'import { deeper } from "./deeper.ts";\n',
      "m1/deeper.ts": 'export const deeper = () => ServedPortals.open({});\n',
      "m1/52-files.test.ts": 'const dist = "packages/portal/dist/client";\n',
      "m1/53-none.test.ts": 'import { other } from "./other.ts";\n',
      "m1/other.ts": "export const other = 1;\n",
      "portal-next/54-own.test.ts": 'import "../served-portal/service.ts";\n',
      "grid/55-grid.test.ts": 'import "../served-portal/service.ts";\n',
    });
    expect(touchingChecks(dir)).toEqual(["m1/50-direct.test.ts", "m1/51-helper.test.ts", "m1/52-files.test.ts"]);
  });
  it("is not fooled by a cycle of imports", () => {
    const dir = tree({ "m1/60-a.test.ts": 'import "./b.ts";\n', "m1/b.ts": 'import "./c.ts";\n', "m1/c.ts": 'import "./b.ts";\n' });
    expect(touchingChecks(dir)).toEqual([]);
  });
});

describe("the run, as the repository stands", () => {
  const touching = touchingChecks();
  it("owes the new client every check that opens a served portal, and says why for each it does not", () => {
    for (const known of ["m1/21-portal-viewer.test.ts", "m1/28-st1-22-rules-in-the-portal.test.ts", "m1/38-m1-12a-request-key.test.ts", "m1/39-m1-49-monitor-derived.test.ts", "m1/40-m1-50-graph.test.ts", "m1/27-k19-no-licence.test.ts"]) expect(touching, known).toContain(known);
    expect(parityChecks()).toEqual(touching.filter((c) => exemptions()[c] === undefined));
    expect(parityChecks().length).toBeGreaterThanOrEqual(5);
  });
  it("every exemption names a check that touches the portal, and gives a reason that says what it judges and when it comes back", () => {
    for (const [check, reason] of Object.entries(exemptions())) {
      expect(touching, `${check} is exempt but touches no portal: take it off exempt.json`).toContain(check);
      expect(reason.length, `${check}'s reason`).toBeGreaterThan(120);
      expect(reason, `${check}'s reason says when it comes back`).toMatch(/cutover|slice \d+/i);
    }
  });
  it("check 27 is out: it packages the old client and never goes through the switch", () => {
    expect(Object.keys(exemptions())).toEqual(["m1/27-k19-no-licence.test.ts"]);
    expect(parityChecks()).not.toContain("m1/27-k19-no-licence.test.ts");
  });
});

describe("the grid's portal evals", () => {
  const cells = (file: string) => (JSON.parse(readFileSync(file, "utf8")) as { cells: Array<{ cell: string; subjects: string[]; switchedBy?: string }> }).cells;
  it("the new client's list is exactly the portal cells of Goal 3's list, so a portal cell that arrives by a merge is owed", () => {
    const theirs = cells(join(e2eRoot, "grid/switched-on.json")).filter((c) => c.cell.endsWith(".portal"));
    expect(cells(join(e2eRoot, "portal-next/grid-switched-on.json"))).toEqual(theirs);
    expect(theirs.length).toBeGreaterThan(0);
  });
  it("every pair on the grid's red list is a pair of that list, once, with a reason", () => {
    const pairs = (JSON.parse(readFileSync(join(e2eRoot, "portal-next/grid-expected-red.json"), "utf8")) as { pairs: Array<{ cell: string; subject: string; reason: string; waitsOn: string }> }).pairs;
    const owed = cells(join(e2eRoot, "portal-next/grid-switched-on.json")).flatMap((c) => c.subjects.map((s) => `${c.cell}:${s}`));
    const listed = pairs.map((p) => `${p.cell}:${p.subject}`);
    expect(new Set(listed).size).toBe(listed.length);
    for (const key of listed) expect(owed, key).toContain(key);
    for (const p of pairs) { expect(p.reason.length).toBeGreaterThan(20); expect(p.waitsOn.length).toBeGreaterThan(10); }
  });
});
