// Check 04 (M8.04): what is declared about time, and the on-time eval. `ortho check` refuses an anchor on a missing
// field, an anchor on a field that is not a time, a calendar anchor with no zone, and `by` on a move with no `from`
// (K23 section 4, blast radius "compiler"); the generated docs and MCP say when each move made by time happens; and the
// tenth eval, on time, passes each move made by time, honours its `late` window, and fails for a keeper delayed on
// purpose, naming the move and the instant it was due (K23 section 3).
//
// The club is examples/signup with `e2e/fixtures/m8/moves` laid over it (check 03's). Each refusal is planted by editing
// one declaration; the unedited club must pass `ortho check`, so a compiler that refuses everything fails here too.
// The keeper's delay is a test hook M8-checks names: `ORTHO_KEEPER_DELAY=<span>` makes a stepped world's keeper fire each
// timer that long after its due instant. `renew` declares `late: "10 minutes"`; `lapse` declares none (M8-checks: none means 0).
//
// Halves, and the slice that turns each green: the compiler and the docs and MCP (M8.09); on time (M8.12).
//
// Red today on the missing surface only: `Blueprint.instant`, `Blueprint.clock`, `Blueprint.time` and `Blueprint.keeper`
// do not exist, so the blueprint does not load, and there is no tenth eval.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { club, generated, nothingRunning, ortho, proveWith } from "./support.ts";

const copies: Array<{ readonly root: string; readonly remove: () => void }> = [];
afterAll(() => {
  for (const copy of copies) copy.remove();
});
const moves = () => {
  const copy = club("moves");
  copies.push(copy);
  return copy.root;
};

const MACHINES = { membership: "blueprint/things/membership/machine.ts", budget: "blueprint/things/budget/machine.ts" } as const;

/** Each declaration the compiler must refuse: the file, the edit, and what the refusal must name. */
const REFUSED: ReadonlyArray<{ readonly what: string; readonly file: string; readonly from: string; readonly to: string; readonly names: ReadonlyArray<RegExp> }> = [
  {
    what: "an anchor on a field the thing does not have",
    file: MACHINES.membership,
    from: 'every("1 month", { from: "startedAt" })',
    to: 'every("1 month", { from: "joinedAt" })',
    names: [/membership\.renew/, /joinedAt/],
  },
  {
    what: "an anchor on a field that is not a time",
    file: MACHINES.membership,
    from: 'every("1 month", { from: "startedAt" })',
    to: 'every("1 month", { from: "name" })',
    names: [/membership\.renew/, /\bname\b/, /time|instant/i],
  },
  {
    what: "an after on a field that is not a time",
    file: MACHINES.membership,
    from: 'after("overdueAt", "14 days")',
    to: 'after("period", "14 days")',
    names: [/membership\.lapse/, /\bperiod\b/, /time|instant/i],
  },
  {
    what: "a calendar anchor with no zone",
    file: MACHINES.budget,
    from: '{ on: { day: 25 }, zone: "Europe/London" }',
    to: "{ on: { day: 25 } }",
    names: [/budget\.reset/, /zone/i],
  },
  {
    what: "a calendar anchor in a zone that does not exist",
    file: MACHINES.budget,
    from: '{ on: { day: "last" }, zone: "Europe/London" }',
    to: '{ on: { day: "last" }, zone: "Europe/Londres" }',
    names: [/budget\.report/, /Europe\/Londres/],
  },
  {
    what: "by on a move with no from",
    file: MACHINES.membership,
    from: "join: { from: [], to: \"active\", emits: Events.MembershipStarted },",
    to: "join: { from: [], to: \"active\", emits: Events.MembershipStarted, by: Blueprint.time.after(\"startedAt\", \"1 day\") },",
    names: [/membership\.join/, /\bfrom\b/],
  },
];

describe("04 M8.04: what is declared about time", () => {
  it("ortho check passes the club as declared", () => {
    const root = generated(moves());
    const run = ortho(root, "check");
    expect(run.status, run.stdout + run.stderr).toBe(0);
  });

  for (const refusal of REFUSED) {
    it(`ortho check refuses ${refusal.what}, naming the move and why`, () => {
      const root = generated(moves());
      const file = join(root, refusal.file);
      const declared = readFileSync(file, "utf8");
      expect(declared.includes(refusal.from), `${refusal.file} lost "${refusal.from}"`).toBe(true);
      writeFileSync(file, declared.replace(refusal.from, refusal.to));
      const run = ortho(root, "check");
      const said = run.stdout + run.stderr;
      expect(run.status, said).toBe(1);
      for (const name of refusal.names) expect(said).toMatch(name);
    });
  }

  it("the generated docs and MCP say when each move made by time happens", () => {
    const root = generated(moves());
    const docs = (op: string) => readFileSync(join(root, "generated/docs", `${op.replace(".", "/")}.md`), "utf8");
    const mcp = readFileSync(join(root, "generated/mcp/src/index.ts"), "utf8");
    const when: ReadonlyArray<readonly [string, RegExp]> = [
      ["membership.renew", /every month from `startedAt`/],
      ["membership.lapse", /14 days after `overdueAt`/],
      ["budget.reset", /every month on day 25, in Europe\/London/],
      ["budget.report", /every month on the last day, in Europe\/London/],
      ["purse.refill", /every month from `openedAt`, worked out at the purse's next use/],
    ];
    for (const [op, said] of when) {
      expect(docs(op), `docs for ${op}`).toMatch(said);
      // The keeper fires every move made by time but a lazy one, which the thing's next use works out (M8-checks call 6).
      if (op === "purse.refill") expect(docs(op), `docs for ${op}`).not.toMatch(/by the keeper/);
      else expect(docs(op), `docs for ${op}`).toMatch(/by the keeper/);
      // MCP descriptions are plain text, so the backticks may go.
      expect(mcp, `mcp for ${op}`).toMatch(new RegExp(said.source.replaceAll("`", "`?")));
    }
    // A move a person makes says nothing of time.
    expect(docs("membership.miss")).not.toMatch(/by the keeper|every month|days after/);
  });
});

describe("04 M8.04: the on-time eval", () => {
  const evalLines = (lines: ReadonlyArray<string>, op: string) => lines.filter((l) => l.startsWith(`${op} on time `));

  it("on time passes every move made by time when the keeper fires at the due instant, and each such move has ten evals", () => {
    const root = generated(moves());
    const run = proveWith({}, root);
    for (const op of ["membership.renew", "membership.lapse", "budget.reset", "budget.report", "purse.refill"]) {
      expect(evalLines(run.lines, op), run.out).toEqual([`${op} on time ✔`]);
      expect(run.lines.some((l) => l.startsWith(`${op} 10 evals ✔`)), `${op}: ten evals\n${run.out}`).toBe(true);
    }
    // A move a person makes is not judged on time, and keeps nine.
    for (const op of ["membership.join", "membership.miss", "purse.spend"]) {
      expect(evalLines(run.lines, op), run.out).toEqual([]);
      expect(run.lines.some((l) => l.startsWith(`${op} 9 evals ✔`)), `${op}: nine evals\n${run.out}`).toBe(true);
    }
    expect(run.status, run.out).toBe(0);
    nothingRunning(root);
  });

  it("a keeper five minutes late is within renew's ten-minute window, and fails lapse, which declares none", () => {
    const root = generated(moves());
    const run = proveWith({ ORTHO_KEEPER_DELAY: "5 minutes" }, root);
    expect(evalLines(run.lines, "membership.renew"), run.out).toEqual(["membership.renew on time ✔"]);
    const lapse = evalLines(run.lines, "membership.lapse");
    expect(lapse.length, run.out).toBeGreaterThan(0);
    for (const line of lapse) expect(line).toMatch(/^membership\.lapse on time ✘ .*2027-02-03T12:00:00\.000Z/);
    expect(evalLines(run.lines, "purse.refill"), "a lazy move is not the keeper's: on time at its first use").toEqual(["purse.refill on time ✔"]);
    expect(run.status, run.out).toBe(1);
    nothingRunning(root);
  });

  it("a keeper two hours late fails on time for renew, naming the instant it was due", () => {
    const root = generated(moves());
    const run = proveWith({ ORTHO_KEEPER_DELAY: "2 hours" }, root);
    const renew = evalLines(run.lines, "membership.renew");
    expect(renew.length, run.out).toBeGreaterThan(0);
    for (const line of renew) expect(line).toMatch(/^membership\.renew on time ✘ .*202[78]-[01]\d-(10|28|29|30|31)T09:00:00\.000Z/);
    // Every late renewal is judged, not only the first: the 31st's renewals fire late on the 28th of February and the
    // 31st of March, in one journey.
    for (const due of ["2027-02-28T09:00:00.000Z", "2027-03-31T09:00:00.000Z"]) expect(renew.join("\n"), run.out).toContain(due);
    expect(run.lines.some((l) => l.startsWith("membership.renew 1 of 10 evals ✘")), run.out).toBe(true);
    expect(evalLines(run.lines, "purse.refill")).toEqual(["purse.refill on time ✔"]);
    expect(run.status, run.out).toBe(1);
    nothingRunning(root);
  });
});
