import { describe, expect, it } from "vitest";
import { Grid } from "./service.ts";
import type { Eval, List } from "./types.ts";

const pass: Eval<string> = { cell: "error.cli", judge: (s, e) => ({ ok: e.includes(s), why: e.includes(s) ? [] : [`expected ${s}, saw ${e}`] }) };
const list: List = { cells: [{ cell: "error.cli", subjects: ["HandleTaken", "NotAllowed"], switchedBy: "claim a free handle" }] };

describe("the list", () => {
  it("is read from its text", () => {
    expect(Grid.parse(list)).toEqual({ ok: true, value: list });
    expect(Grid.parse({ cells: [] })).toEqual({ ok: true, value: { cells: [] } });
  });

  it("names every problem: a cell not in the grid, no subjects, no journey, a repeat, not a list", () => {
    const bad = Grid.parse({ cells: [
      { cell: "error.fax", subjects: ["A"], switchedBy: "j" },
      { cell: "error.cli", subjects: [], switchedBy: "j" },
      { cell: "error.mcp", subjects: ["A"] },
      { cell: "error.docs", subjects: ["A"], switchedBy: "j" },
      { cell: "error.docs", subjects: ["B"], switchedBy: "j" },
    ] });
    expect(bad.ok).toBe(false);
    expect(!bad.ok && bad.problems).toEqual([
      'cells[0].cell "error.fax" is not <block>.<output> of K14\'s grid',
      "cells[1].subjects must be a non-empty list of names",
      "cells[2].switchedBy must name the journey that touched it first",
      "cell error.docs is listed twice",
    ]);
    expect(Grid.parse(null).ok).toBe(false);
    expect(Grid.parse([])).toEqual({ ok: false, problems: ['the list needs a "cells" array'] });
  });

  it("switches cells on and never off: the first journey stays, subjects join", () => {
    const next = Grid.switchOn(list, [
      { cell: "error.cli", subjects: ["HandleTaken", "LinkMissing"], switchedBy: "a later journey" },
      { cell: "error.docs", subjects: ["HandleTaken"], switchedBy: "a later journey" },
    ]);
    expect(next.cells).toEqual([
      { cell: "error.cli", subjects: ["HandleTaken", "NotAllowed", "LinkMissing"], switchedBy: "claim a free handle" },
      { cell: "error.docs", subjects: ["HandleTaken"], switchedBy: "a later journey" },
    ]);
    expect(Grid.switchOn(list, [])).toEqual(list);
  });
});

describe("the run", () => {
  const options = { list, evals: [pass], revision: "abc123", environment: "local" } as const;

  it("judges each subject of each switched-on cell, and passes when all are green", () => {
    const report = Grid.run({ ...options, evidence: () => "HandleTaken NotAllowed" });
    expect(report.verdicts.map((v) => [v.cell, v.subject, v.verdict])).toEqual([["error.cli", "HandleTaken", "pass"], ["error.cli", "NotAllowed", "pass"]]);
    expect(report.passed).toBe(true);
    expect(Grid.lines(report).at(-1)).toBe("grid ✔ 2 of 2 switched-on cells green");
  });

  it("fails on one red subject and says what was expected and what was seen", () => {
    const report = Grid.run({ ...options, evidence: (_, subject) => (subject === "HandleTaken" ? "HandleTaken" : "nothing") });
    expect(report.passed).toBe(false);
    expect(report.verdicts.map((v) => v.verdict)).toEqual(["pass", "fail"]);
    expect(Grid.lines(report)).toEqual([
      "✔ error.cli HandleTaken",
      "✘ error.cli NotAllowed",
      'error.cli NotAllowed (switched on by "claim a free handle")',
      "  expected NotAllowed, saw nothing",
      "grid ✘ 1 of 2 switched-on cells green",
    ]);
  });

  it("makes a cell with no eval red, because nothing proves it", () => {
    const report = Grid.run({ ...options, list: { cells: [{ cell: "error.mcp", subjects: ["HandleTaken"], switchedBy: "j" }] }, evidence: () => "" });
    expect(report.passed).toBe(false);
    expect(report.verdicts[0]?.why[0]).toMatch(/error\.mcp is switched on and has no eval/);
  });

  it("runs an empty list and passes, with nothing to say but the count", () => {
    const report = Grid.run({ ...options, list: { cells: [] }, evidence: () => "" });
    expect(report).toEqual({ revision: "abc123", environment: "local", verdicts: [], passed: true });
    expect(Grid.lines(report)).toEqual(["grid ✔ 0 of 0 switched-on cells green"]);
  });

  it("combines the reports of runs over different evidence: the verdicts in order, passed only when every run passed", () => {
    const green = Grid.run({ ...options, list: { cells: [{ cell: "error.cli", subjects: ["HandleTaken"], switchedBy: "j" }] }, evidence: () => "HandleTaken" });
    const red = Grid.run({ ...options, list: { cells: [{ cell: "error.cli", subjects: ["NotAllowed"], switchedBy: "j" }] }, evidence: () => "nothing" });
    const both = Grid.combine([green, red], "abc123", "local");
    expect(both.verdicts.map((v) => `${v.verdict} ${v.subject}`)).toEqual(["pass HandleTaken", "fail NotAllowed"]);
    expect(both.passed).toBe(false);
    expect(Grid.combine([green], "abc123", "local").passed).toBe(true);
    expect(Grid.combine([], "abc123", "local")).toEqual({ revision: "abc123", environment: "local", verdicts: [], passed: true });
  });

  it("asks for evidence once per (cell, subject), with the cell and the subject", () => {
    const asked: Array<string> = [];
    Grid.run({ ...options, evidence: (cell, subject) => { asked.push(`${cell}/${subject}`); return subject; } });
    expect(asked).toEqual(["error.cli/HandleTaken", "error.cli/NotAllowed"]);
  });
});

describe("the ratchet (G7)", () => {
  const verdict = (subject: string, pass: boolean) => ({ cell: "error.cli" as const, subject, verdict: pass ? ("pass" as const) : ("fail" as const), switchedBy: "j", why: [] });
  const report = { revision: "r", environment: "local", verdicts: [verdict("A", true), verdict("B", false)], passed: false };
  const entry = (subject: string) => ({ cell: "error.cli" as const, subject, reason: "why", waitsOn: "M1.13" });

  it("passes when the red pairs are exactly the listed ones", () => {
    const result = Grid.ratchet(report, [entry("B")]);
    expect(result).toEqual({ unexpected: [], unjudged: [], fixed: [], expectedRed: 1, ok: true });
    expect(Grid.ratchetLines(result)).toEqual(["ratchet ✔ 1 expected red, 0 unexpected, 0 newly green, 0 not switched on"]);
  });
  it("fails on a red pair that is not listed", () => {
    const result = Grid.ratchet(report, []);
    expect(result.unexpected).toEqual(["error.cli:B"]);
    expect(Grid.ratchetLines(result)[0]).toBe("✘ red and not on e2e/grid/expected-red.json: error.cli:B");
  });
  it("fails on a listed pair that is green, which must come off the list in the same change", () => {
    const result = Grid.ratchet(report, [entry("A"), entry("B")]);
    expect(result.fixed).toEqual(["error.cli:A"]);
    expect(result.ok).toBe(false);
    expect(Grid.ratchetLines(result)[0]).toBe("✘ now green, take it off expected-red.json: error.cli:A");
  });
  it("fails on a listed pair that is not switched on", () => {
    const result = Grid.ratchet(report, [entry("B"), entry("C")]);
    expect(result.unjudged).toEqual(["error.cli:C"]);
    expect(result.ok).toBe(false);
  });
  it("reads the list and names every problem", () => {
    expect(Grid.parseExpected({ pairs: [entry("B")] }).ok).toBe(true);
    const bad = Grid.parseExpected({ pairs: [{ cell: "error.fax", subject: "B", reason: "", waitsOn: "x" }, entry("B"), entry("B")] });
    expect(!bad.ok && bad.problems).toEqual(['pairs[0].cell "error.fax" is not a cell of the grid', "pairs[0].reason must say something", "error.cli:B is listed twice"]);
    expect(Grid.parseExpected([]).ok).toBe(false);
  });
});
