// node --test tools/github/adopt.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseBoard } from "./board.mjs";
import { ORIGINAL, adoptionProblems, foldComment, issueOfRow, itemMarker } from "./boardPlan.mjs";
import { empty, page, plan, row } from "./fixtures.mjs";

const ask = (number, body = "The ask, in its own words.\r\nSecond line.", extra = {}) => ({
  number, title: `Ask (Goal 16, for Goal 3): something #${number}`, body, state: "open", trusted: true, pullRequest: false,
  labels: ["kind:ask", "release:1.0", "goal-17", "harness:amp"], milestone: "Goal 17: the superagent", type: "Ask", ...extra,
});
const adopting = parseBoard(page(
  row("principals", "Principals: agent, service and system callers", "building", "superagent", "beta", "coding agent", "goal-17", "`packages/orthograph/src/modules/roles`", "—", "`issue #531`, `folds #533`; K40 fix 1"),
  row("versions", "Versions: things with `versions:`", "provisional", "superagent", "beta", "coding agent", "none", "`packages/orthograph`", "principals", "`issue #532`"),
)).rows;

test("adopting: the row's issue is an existing one, relabelled and moved, its words kept beneath the page, the others folded", () => {
  assert.deepEqual([adopting[0].adopts, adopting[0].folds, adopting[1].adopts, adopting[1].folds], [531, [533], 532, []]);
  const state = { ...empty, issues: [ask(531), ask(532), ask(533)] };
  const steps = plan(adopting, state);
  assert.equal(steps.filter((s) => s.do === "createIssue").length, 0, "nothing is created beside an adopted issue");
  const first = steps.find((s) => s.do === "updateIssue" && s.number === 531);
  assert.deepEqual([first.adopt, first.title, first.milestone, first.type], [true, "Principals", "Superagent: the coding agent end to end", "Capability"]);
  assert.deepEqual(first.labels, ["goal-17", "harness:amp", "kind:capability", "release:beta", "lane:goal-17"], "kind:ask goes, the others stay");
  assert.ok(first.body.startsWith(itemMarker("principals")));
  assert.ok(first.body.includes(`\n\n${ORIGINAL}\n> The text this issue had before the board adopted it`));
  assert.ok(first.body.endsWith("The ask, in its own words.\nSecond line."), "line endings normalised, words intact");
  assert.deepEqual(steps.filter((s) => s.do === "foldIssue").map((s) => [s.number, s.into, s.row]), [[533, 531, "principals"]]);
  assert.match(foldComment(adopting[0], 531), /same item as #531/);
});

test("adopting, run twice: the marker is on the issue, so there is no second adoption, no lost text and no second fold", () => {
  const first = plan(adopting, { ...empty, issues: [ask(531), ask(532), ask(533)] });
  const issues = [531, 532, 533].map((n) => {
    const s = first.find((x) => x.do === "updateIssue" && x.number === n);
    const folded = first.some((x) => x.do === "foldIssue" && x.number === n);
    return s ? ask(n, s.body, { labels: s.labels, milestone: s.milestone, type: s.type, title: s.title }) : ask(n, undefined, { state: folded ? "closed" : "open" });
  });
  const state = {
    ...empty,
    issues,
    labels: [{ name: "lane:goal-17" }],
    milestones: first.filter((s) => s.do === "createMilestone").map((s, k) => ({ number: k + 1, title: s.title, description: s.description })),
  };
  const second = plan(adopting, state);
  assert.deepEqual(second.filter((s) => s.do === "updateIssue" || s.do === "foldIssue").map((s) => [s.do, s.number]), [], "nothing left to write");
  assert.ok(issueOfRow(adopting[0], issues), "found again, by its number or its marker");
});

test("adoption problems: an issue that is missing, a pull request, an outsider's or another row's is named before anything is written", () => {
  const rowsBad = parseBoard(page(
    row("a", "A: one", "building", "framework", "—", "—", "none", "—", "—", "`issue #1`, `folds #2, #3`"),
    row("b", "B: two", "building", "framework", "—", "—", "none", "—", "—", "`issue #4`, `folds #5`"),
  )).rows;
  const issues = [ask(1), ask(2, "x", { pullRequest: true }), ask(3, "x", { trusted: false }), ask(4, `${itemMarker("c")}\nbody`, { labels: ["kind:capability"] })];
  assert.deepEqual(adoptionProblems(rowsBad, issues), [
    "a folds #2, which is a pull request",
    "a folds #3, which an outsider opened",
    "b adopts #4, which is the board's issue for c",
    "b folds #5, which is no issue",
  ]);
  const bad = (cell) => parseBoard(page(row("a", "A: one", "building", "framework", "—", "—", "none", "—", "—", cell), row("b", "B: two", "building", "framework", "—", "—", "none", "—", "—", "`issue #7`"))).errors.join();
  assert.match(bad("`issue #1`, `issue #2`"), /adopts 2 issues/);
  assert.match(bad("`folds #1`"), /folds issues but adopts none/);
  assert.match(bad("`issue #7`"), /already adopted or folded by row a/);
});

test("only kind:ask issues are adopted or folded: a snag (a claim is one), a decision, a goal or a slice is refused by name", () => {
  const rowsBad = parseBoard(page(
    row("a", "A: one", "building", "framework", "—", "—", "none", "—", "—", "`issue #1`, `folds #2, #3`"),
    row("b", "B: two", "building", "framework", "—", "—", "none", "—", "—", "`issue #4`, `folds #5`"),
  )).rows;
  const issues = [
    ask(1),
    ask(2, "x", { labels: ["kind:snag", "lane:goal-17"] }),
    ask(3, "x", { labels: ["kind:decision", "needs-aaron"] }),
    ask(4, "x", { labels: ["kind:goal"] }),
    ask(5, "x", { labels: ["kind:slice"] }),
  ];
  assert.deepEqual(adoptionProblems(rowsBad, issues).map((p) => p.replace(/: only.*/, "")), [
    "a folds #2, which is a snag",
    "a folds #3, which is a decision",
    "b adopts #4, which is a goal",
    "b folds #5, which is a slice",
  ]);
  assert.match(adoptionProblems(rowsBad, issues)[0], /name it as a plain #2/);
  assert.deepEqual(adoptionProblems(parseBoard(page(row("a", "A: one", "building", "framework", "—", "—", "none", "—", "—", "`issue #1`"))).rows, [ask(1)]), []);
});

test("adopting: an issue with no kind:ask (a plain bug) is refused, but the row's own adopted issue passes on a later run", () => {
  const rows = parseBoard(page(row("a", "A: one", "building", "framework", "—", "—", "none", "—", "—", "`issue #1`, `folds #2`"))).rows;
  const bug = (n) => ask(n, "x", { labels: ["bug"] });
  assert.deepEqual(adoptionProblems(rows, [bug(1), bug(2)]).map((p) => p.replace(/: only.*/, "")), [
    "a adopts #1, which is no kind:ask issue",
    "a folds #2, which is no kind:ask issue",
  ]);
  const adopted = ask(1, `${itemMarker("a")}\n\nbody`, { labels: ["kind:capability", "release:1.0"] });
  assert.deepEqual(adoptionProblems(rows, [adopted, ask(2)]), [], "a re-run finds its own adopted issue");
});
