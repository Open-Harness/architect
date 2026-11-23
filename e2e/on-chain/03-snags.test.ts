// Goal 4's done check, fourth line (`design/goals/04-on-chain.md`, "The done check": every snag in `04-snags.md` is fixed, or parked with an
// owner and a reason). Written by the checks author; a builder never edits this file (AGENTS.md, "Journeys and checks come first").
//
// WHAT IS REQUIRED (snags.ts has the reader). In `design/goals/04-snags.md`:
// - every `S-nn` is a `## S-nn · title` heading outside any quote or fence, numbered from S-01 with no gap or repeat (S-01 to S-11 at least),
//   and the headings equal the `- Status:` lines in count;
// - each entry keeps its Hit, Lost, Cause, Fix and Status lines once, each with at least three words;
// - Status is `fixed (#n …)`, #n a pull request merged into this branch (`Merge pull request #n` in `git log HEAD`), or `fixed (<commit> …)`,
//   a commit in `git log HEAD` (CI checks out the whole history); or `parked (who, when): reason. Owner: <role>`, the reason four distinct
//   words of three letters or more, the owner a role or thread that exists (the lead, a goal lead, the journey author, a checks author, a
//   framework builder, the reviewer, the user, Aaron) and no placeholder.
// `open` and `building` fail, each named with its snag. The failure lists every problem.
//
// THE CONTROLS plant each hole the hostile pass found and each way below, against the reader: a fixed snag citing no merged change (an
// unrelated or unmerged #n, #0, a hash that is not a commit, a bare word, a trailing "but still open", "fixed-ish"); a placeholder owner
// (TBD, nobody, 1, me, a file); a junk reason (single letters, one word repeated, three words); an owner or reason missing; an entry
// hidden in a quote or a fence, or with a heading not in the strict form; an entry gutted to a heading and a status; a status missing, doubled
// or in an unknown word; an entry deleted or repeated; an empty log.
import { describe, expect, it } from "vitest";
import { FIRST_SNAGS, gitHistory, readSnagLog, snagProblems, type History } from "./snags.ts";

const HASH = "1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d";
const HIST: History = { prs: new Set([321]), commits: [HASH], shallow: false };
const FIXED = "fixed (#321 the field, in the report)";
const PARKED = "parked (the lead, 21 November 2026): nothing builds it this goal, so it waits. Owner: the Goal 4 lead. Revisit at M6.20.";
const fields = "- Hit: someone hit it here.\n- Lost: ten minutes of work.\n- Cause: the framework lacks it.\n- Fix: framework, build the piece.\n";
const entry = (n: number, status: string | undefined) => `## S-${String(n).padStart(2, "0")} · "a snag"\n${fields}${status === undefined ? "" : `- Status: ${status}\n`}\n`;
const log = (statuses: ReadonlyArray<string | undefined>, tail = "") => `# Goal 4: the snag log\n\nStatus is one of open.\n\n${statuses.map((s, i) => entry(i + 1, s)).join("")}${tail}`;
const all = (status: string | undefined) => Array.from({ length: FIRST_SNAGS }, () => status);
const withFirst = (status: string | undefined) => log([status, ...all(FIXED).slice(1)]);
const problems = (text: string) => snagProblems(text, HIST);
const bad = (status: string | undefined) => expect(problems(withFirst(status)), `status: ${status}`).not.toEqual([]);

describe("controls: snagProblems judges each wrong reading", () => {
  it("accepts a log of fixed and parked snags", () => {
    expect(problems(log(all(FIXED)))).toEqual([]);
    expect(problems(log(all(PARKED)))).toEqual([]);
    expect(problems(log(all("fixed (1a2b3c4 a commit prefix)")))).toEqual([]);
    expect(problems(withFirst("parked (Goal 3 lead, today): the wallet slice is later work. Owner: a framework builder (slice 3)."))).toEqual([]);
  });
  it("names an open and a building snag", () => {
    expect(problems(withFirst("open"))).toEqual(['S-01 ("a snag") is open']);
    expect(problems(withFirst("open, blocks the climb"))).toEqual(['S-01 ("a snag") is open']);
    expect(problems(withFirst("Open"))).not.toEqual([]);
    expect(problems(withFirst("building (#321)"))).toEqual(['S-01 ("a snag") is building']);
  });
  it("refuses a fixed snag that cites no change merged into the branch", () => {
    for (const s of ["fixed", "fixed (done in slice 3)", "fixed (unrelated #99999)", "fixed (#99999)", "fixed #0", "fixed (#0)", "fixed #321", "fixed (not really, deadbeef)",
      "fixed facaded", "fixed (facaded)", "fixed (1a2b3c)", "fixed (#321) but still open", "fixed-ish (#321)", "fixed (#321", "fixed (#321 and (nested))", "fixed (see #321)"]) bad(s);
  });
  it("refuses a parked snag with a placeholder, a missing or an invented owner", () => {
    for (const owner of ["TBD", "nobody", "1", "me", "later.md", "later.md (chain)", "the lead and TBD", "someone", "", "Aaron's cat"]) bad(`parked (the lead, today): nothing builds it this goal, so it waits. Owner: ${owner}.`);
    bad("parked (the lead, today): nothing builds it this goal, so it waits.");
    bad("parked (the lead, today): nothing builds it this goal, so it waits. Owner:");
  });
  it("refuses a parked snag with a junk reason", () => {
    for (const reason of ["", "a b c d", "lol lol lol lol", "nothing builds this", "wait wait wait wait", "x1 x2 x3 x4"]) bad(`parked (the lead, today): ${reason} Owner: the lead.`);
    bad("parked. Owner: the lead");
  });
  it("accepts every owner that exists", () => {
    for (const owner of ["the lead", "the Goal 4 lead", "Goal 3 lead", "the journey author", "a checks author", "the checks author", "a framework builder", "the reviewer", "the user (the DX trial)", "Aaron"])
      expect(problems(withFirst(`parked (the lead, today): nothing builds it this goal, so it waits. Owner: ${owner}.`)), owner).toEqual([]);
  });
  it("refuses a status line missing, doubled, or in an unknown word", () => {
    expect(problems(withFirst(undefined))).toEqual(expect.arrayContaining(['S-01 ("a snag") has 0 `- Status:` lines, not one']));
    expect(problems(log(all(FIXED)).replace(`- Status: ${FIXED}\n`, `- Status: ${FIXED}\n- Status: ${FIXED}\n`))).not.toEqual([]);
    for (const s of ["done (#321)", "", "wontfix"]) bad(s);
  });
  it("refuses an entry deleted or repeated, or no log", () => {
    expect(problems(log(all(FIXED).slice(1)))).toEqual([`S-${FIRST_SNAGS} is missing from the log (an entry is never deleted)`]);
    expect(problems(log(all(FIXED)).replace("## S-02", "## S-01")).length).toBeGreaterThan(0);
    expect(problems("").length).toBeGreaterThanOrEqual(FIRST_SNAGS);
  });
  it("refuses an entry hidden in a quote or a fence, or headed in another form", () => {
    expect(problems(log(all(FIXED), "> ## S-12 · hidden\n> - Status: open\n"))).not.toEqual([]);
    expect(problems(log(all(FIXED), "```md\n## S-12 · hidden\n- Status: open\n```\n"))).not.toEqual([]);
    expect(problems(log(all(FIXED), "### S-12 · hidden\n- Status: open\n"))).not.toEqual([]);
    expect(problems(log(all(FIXED), "## S-12 · a snag\n- Status: fixed (#321 hidden)\n").replace("## S-12 · a snag\n", "## S-12 · a snag\n" + fields))).toEqual([]);
    expect(problems(log(all(FIXED), "## S-12 · open entry\n" + fields + "- Status: open\n"))).toEqual(['S-12 (open entry) is open']);
  });
  it("refuses a heading without a Status line, and a Status line without a heading", () => {
    expect(problems(log(all(FIXED), "## S-12 · bare\n" + fields))).not.toEqual([]);
    expect(problems(log(all(FIXED), "- Status: open\n"))).not.toEqual([]);
  });
  it("refuses an entry gutted to a heading and a status, or with an empty field", () => {
    expect(problems(log(all(FIXED), `## S-12 · gutted\n- Status: ${FIXED}\n`))).toHaveLength(4);
    for (const f of ["Hit", "Lost", "Cause", "Fix"]) {
      expect(problems(withFirst(FIXED).replace(new RegExp(`^- ${f}:.*\n`, "m"), ""))).toHaveLength(1);
      expect(problems(withFirst(FIXED).replace(new RegExp(`^- ${f}:.*`, "m"), `- ${f}: ok`))).toHaveLength(1);
      expect(problems(withFirst(FIXED).replace(new RegExp(`^- ${f}:.*`, "m"), `- ${f}:`))).toHaveLength(1);
    }
  });
  it("reads only the Status line, and judges every entry, not the first", () => {
    expect(problems(log([FIXED, "open", ...all(FIXED).slice(2)]))).toEqual(['S-02 ("a snag") is open']);
    expect(problems(log([...all(FIXED).slice(1), "fixed (#99999 x)"]))).toHaveLength(1);
  });
});

describe("the snag log of Goal 4", () => {
  it("every snag in design/goals/04-snags.md is fixed, or parked with an owner and a reason", () => {
    const text = readSnagLog();
    expect(text, "design/goals/04-snags.md is missing").not.toBe("");
    const history = gitHistory();
    expect(history.shallow, "the clone is shallow, so `git log HEAD` cannot say what was merged: check out with fetch-depth: 0").toBe(false);
    const found = snagProblems(text, history);
    expect(found, `${found.length} problem(s) in the snag log:\n${found.join("\n")}`).toEqual([]);
  });
});
