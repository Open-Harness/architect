// node --test tools/github/sync.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readGoal, splitFrontMatter } from "./frontmatter.mjs";
import { ISSUE_TYPES, LABELS, unwrap, goalBody, goalMarker, goalView, plan, sliceMarker } from "./plan.mjs";

const brief = `---
goal: 6
title: The new portal
milestone: "Goal 6: the new portal"
release: beta   # K28
branch: goal/portal
base: goal/stage-1
status: ready
lead:
  harness: amp
  model: null
  since: null
done_check: nx run e2e:portal-next
owns:
  - packages/theme/
  - packages/shell/
slices:
  - "1 · The theme"
  - "2 · The checks (after 1)"
---
# Goal 6: the new portal

## The goal, in plain words

- **In one sentence:** Build a new portal.

## Where it stands

Slice 1 is open.
`;

test("front matter: scalars, comments, a nested map and block lists", () => {
  const { data, body } = splitFrontMatter(brief);
  assert.equal(data.goal, 6);
  assert.equal(data.release, "beta");
  assert.deepEqual(data.lead, { harness: "amp", model: null, since: null });
  assert.deepEqual(data.owns, ["packages/theme/", "packages/shell/"]);
  assert.match(body, /^# Goal 6/);
});

test("a line it does not understand is an error, never a silent skip", () => {
  assert.match(splitFrontMatter("---\ngoal: 6\n    deep: x\n---\n").error, /not understood/);
});

test("a brief with no front matter still names its goal, from its file name and heading", () => {
  const { goal } = readGoal("design/goals/03-stage-1-hill-climbed.md", "# Goal 3: stage 1, hill-climbed\n\nText.\n");
  assert.equal(goal.number, 3);
  assert.equal(goal.milestone, "Goal 3: stage 1, hill-climbed");
  assert.equal(goal.declared, false);
});

const empty = { labels: [], milestones: [], issues: [] };
const url = () => "https://example.test/brief";

test("from nothing: every label, the milestone, the goal issue, and each slice under it", () => {
  const { goal } = readGoal("design/goals/06-portal.md", brief);
  const steps = plan({ goals: [goal], state: empty, briefUrl: url });
  assert.equal(steps.filter((s) => s.do === "createLabel").length, LABELS.length);
  assert.ok(steps.some((s) => s.do === "createMilestone" && s.title === "Goal 6: the new portal"));
  const g = steps.find((s) => s.do === "createIssue" && s.key === "goal 6");
  assert.equal(g.type, "Feature", "a person's repository: the nearest native type");
  assert.deepEqual(g.labels, ["kind:goal", "goal-6", "release:beta"]);
  assert.ok(g.body.includes(goalMarker(6)) && g.body.includes("amp"));
  assert.deepEqual(
    steps.filter((s) => s.do === "addSubIssue").map((s) => s.child),
    ["slice 6.1", "slice 6.2"],
  );
});

test("run twice: once GitHub holds it all, there is nothing to do", () => {
  const { goal } = readGoal("design/goals/06-portal.md", brief);
  const state = {
    labels: LABELS,
    milestones: [{ number: 9, title: goal.milestone, description: `Goal 6. Brief: ${goal.brief}. Done check: ${goal.done_check}.` }],
    issues: [
      { number: 10, title: "Goal 6: The new portal", body: "", labels: ["kind:goal"], type: "Feature", milestone: goal.milestone, subIssues: [11, 12] },
      { number: 11, title: "Goal 6 · 1 · The theme", body: sliceMarker(6, 1), labels: ["kind:slice"], type: "Task", milestone: goal.milestone },
      { number: 12, title: "Goal 6 · 2 · The checks", body: sliceMarker(6, 2), labels: ["kind:slice"], type: "Task", milestone: goal.milestone, blockedBy: [11] },
    ],
  };
  state.issues[0].body = goalBody(goal, url(), goalView(goal, state));
  assert.deepEqual(plan({ goals: [goal], state, briefUrl: url }), []);
});

test("migrate: a goal label becomes the goal's milestone, a release milestone becomes a release label", () => {
  const { goal } = readGoal("design/goals/06-portal.md", brief);
  const state = { labels: LABELS, milestones: [], issues: [{ number: 285, title: "K31", body: "", state: "open", labels: ["goal-6"], milestone: "Beta" }] };
  const move = plan({ goals: [goal], state, briefUrl: url, migrate: true }).find((s) => s.do === "moveIssue");
  assert.deepEqual(move, { do: "moveIssue", number: 285, addLabels: ["release:beta"], milestone: "Goal 6: the new portal" });
});

test("the real briefs in this checkout parse", () => {
  for (const f of ["design/goals/05-ui-layer.md", "design/goals/06-portal.md"]) {
    const r = readGoal(f, readFileSync(f, "utf8"));
    assert.equal(r.error, undefined, r.error);
    assert.ok(r.goal.declared, `${f} has front matter`);
    assert.ok(r.goal.slices.length > 0, `${f} lists its slices`);
  }
});

test("a pull request or a stray issue that quotes a marker is never taken for the goal or a slice", () => {
  const { goal } = readGoal("design/goals/06-portal.md", brief);
  const state = {
    labels: LABELS,
    milestones: [],
    issues: [
      { number: 400, title: "a PR quoting the marker", body: goalMarker(6) + sliceMarker(6, 1), labels: ["kind:goal", "kind:slice"], pullRequest: true },
      { number: 401, title: "an issue quoting it", body: goalMarker(6), labels: [] },
    ],
  };
  const steps = plan({ goals: [goal], state, briefUrl: url });
  assert.ok(!steps.some((s) => s.number === 400 || s.number === 401 || s.parent === 400 || s.parent === 401));
  assert.ok(steps.some((s) => s.do === "createIssue" && s.key === "goal 6"));
});

test("a slice's order becomes a blocked-by link, made once", () => {
  const { goal } = readGoal("design/goals/06-portal.md", brief);
  assert.deepEqual(goal.slices[1], { number: "2", title: "The checks", after: ["1"] });
  const fresh = plan({ goals: [goal], state: empty, briefUrl: url }).filter((s) => s.do === "addBlockedBy");
  assert.deepEqual(fresh.map((s) => [s.issue, s.blocker]), [["slice 6.2", "slice 6.1"]]);
});

test("a link between two slices that the brief no longer orders is removed before any is added", () => {
  const text = brief.replace('  - "2 · The checks (after 1)"', '  - "2 · The checks"\n  - "3 · The docs (after 2)"').replace('"1 · The theme"', '"1 · The theme (after 3)"');
  const { goal } = readGoal("design/goals/06-portal.md", text);
  const state = {
    labels: LABELS,
    milestones: [],
    issues: [
      { number: 11, title: "Goal 6 · 1 · The theme", body: sliceMarker(6, 1), labels: ["kind:slice"], milestone: goal.milestone, blockedBy: [] },
      { number: 12, title: "Goal 6 · 2 · The checks", body: sliceMarker(6, 2), labels: ["kind:slice"], milestone: goal.milestone, blockedBy: [11, 20, 21] },
      { number: 13, title: "Goal 6 · 3 · The docs", body: sliceMarker(6, 3), labels: ["kind:slice"], milestone: goal.milestone, blockedBy: [12] },
      { number: 20, title: "a snag", body: "", state: "open", labels: ["kind:snag"] },
      { number: 21, title: "Goal 7 · 1 · Another goal's slice", body: sliceMarker(7, 1), state: "open", labels: ["kind:slice"] },
    ],
  };
  const links = plan({ goals: [goal], state, briefUrl: url }).filter((s) => /BlockedBy$/.test(s.do)).map((s) => [s.do, s.issue, s.blocker]);
  assert.deepEqual(links, [["removeBlockedBy", 12, 11], ["addBlockedBy", 11, 13]], "the stale 2-after-1 goes first; the snag's link and another goal's slice stay");
});

test("a parked goal's open issues carry `parked`; a shared, claimed or board issue never does, and it comes off on resuming", () => {
  const parkedGoal = readGoal("design/goals/06-portal.md", brief.replace("status: ready", "status: parked")).goal;
  const other = readGoal("design/goals/07-x.md", brief.replace("goal: 6", "goal: 7").replace('"Goal 6: the new portal"', '"Goal 7: x"')).goal;
  const issues = [
    { number: 50, title: "a slice", body: "", state: "open", labels: ["kind:slice", "goal-6"] },
    { number: 51, title: "shared with a running goal", body: "", state: "open", labels: ["kind:snag", "goal-6", "goal-7"] },
    { number: 52, title: "a board row", body: "", state: "open", labels: ["kind:capability", "goal-6"] },
    { number: 53, title: "claimed by a running goal", body: "", state: "open", labels: ["kind:snag", "goal-6", "lane:goal-7"] },
    { number: 54, title: "closed", body: "", state: "closed", labels: ["kind:slice", "goal-6"] },
    { number: 55, title: "a pull request", body: "", state: "open", pullRequest: true, labels: ["goal-6"] },
  ];
  const parkedSteps = (goals, list) => plan({ goals, state: { labels: LABELS, milestones: [], issues: list }, briefUrl: url }).filter((s) => s.do === "setParked").map((s) => [s.number, s.parked]);
  assert.deepEqual(parkedSteps([parkedGoal, other], issues), [[50, true]]);
  const resumed = readGoal("design/goals/06-portal.md", brief).goal;
  assert.deepEqual(parkedSteps([resumed, other], [{ ...issues[0], labels: [...issues[0].labels, "parked"] }]), [[50, false]], "it comes off when the goal resumes");
  assert.deepEqual(parkedSteps([parkedGoal, other], [{ ...issues[0], labels: [...issues[0].labels, "parked"] }]), [], "made once");
});

test("the goal page: the plain card, the progress, what is stuck and on whom, and where it stands", () => {
  const { goal } = readGoal("design/goals/06-portal.md", brief);
  const state = {
    issues: [
      { number: 11, title: "Goal 6 · 1 · The theme", body: sliceMarker(6, 1), state: "closed", labels: ["kind:slice"], milestone: goal.milestone },
      { number: 12, title: "Goal 6 · 2 · The checks", body: sliceMarker(6, 2), state: "open", labels: ["kind:slice"], milestone: goal.milestone, blockedBy: [11, 20, 21] },
      { number: 20, title: "the data API has no field X", state: "open", labels: ["kind:snag"], milestone: goal.milestone },
      { number: 21, title: "add field X", state: "open", labels: ["kind:ask"], milestone: "Goal 3: stage 1" },
      { number: 22, title: "an old snag", state: "closed", labels: ["kind:snag"], milestone: goal.milestone },
    ],
  };
  const page = goalBody(goal, url(), goalView(goal, state));
  assert.match(page, /## The goal, in plain words\n\n- \*\*In one sentence:\*\* Build a new portal\./);
  assert.match(page, /\*\*1 of 2 slices done\.\*\* Nothing is ready: every open slice waits on something\./);
  assert.match(page, /## Open snags\n\n- #20 the data API has no field X \(blocks slice 2\)\n/);
  assert.ok(!page.includes("#22"), "a closed snag is not listed");
  assert.match(page, /- #21 add field X, in Goal 3: stage 1 \(blocks slice 2\)/);
  assert.match(page, /## Where it stands\n\nSlice 1 is open\./);
  assert.match(page, /\*\*Lead:\*\* amp/);
});

test("an outsider's issue with the right label and marker is never taken, and a later copy never displaces the first", () => {
  const { goal } = readGoal("design/goals/06-portal.md", brief);
  const state = {
    labels: LABELS,
    milestones: [],
    issues: [
      { number: 500, title: "spoof", body: goalMarker(6), labels: ["kind:goal"], trusted: false },
      { number: 30, title: "Goal 6: The new portal", body: goalMarker(6), labels: ["kind:goal"] },
      { number: 31, title: "a later copy", body: goalMarker(6), labels: ["kind:goal"] },
    ],
  };
  const steps = plan({ goals: [goal], state, briefUrl: url });
  assert.ok(!steps.some((s) => s.do === "createIssue" && s.key === "goal 6"));
  assert.ok(steps.some((s) => s.do === "updateIssue" && s.number === 30));
  assert.ok(!steps.some((s) => s.number === 500 || (s.number === 31 && s.do !== "setType")));
});

test("in an organization each kind is its own type: made once, set on new and existing issues", () => {
  const { goal } = readGoal("design/goals/06-portal.md", brief);
  const state = { ownerType: "Organization", types: ["Task", "Bug", "Feature"], labels: LABELS, milestones: [], issues: [
    { number: 40, title: "a snag", body: "", labels: ["kind:snag"], type: "Bug", state: "open" },
  ] };
  const steps = plan({ goals: [goal], state, briefUrl: url });
  assert.deepEqual(steps.filter((s) => s.do === "createIssueType").map((s) => s.name), ISSUE_TYPES.map((x) => x.name));
  assert.equal(steps.find((s) => s.do === "createIssue" && s.key === "goal 6").type, "Goal");
  assert.deepEqual(steps.find((s) => s.do === "setType"), { do: "setType", number: 40, type: "Snag" });
  const after = { ...state, types: [...state.types, ...ISSUE_TYPES.map((x) => x.name)], issues: [{ ...state.issues[0], type: "Snag" }] };
  assert.ok(!plan({ goals: [goal], state: after, briefUrl: url }).some((s) => s.do === "createIssueType" || s.do === "setType"));
});

test("wrapped prose is joined into whole lines, and lists, headings, tables and code keep theirs", () => {
  const src = "- **Why:** one\n  two\n- **It is:** three\n\nA para\nwraps here.\n\n| a |\n| b |\n```\nx\ny\n```";
  assert.equal(unwrap("## H\ntext\n```\ncode\n```\nafter"), "## H\ntext\n```\ncode\n```\nafter");
  assert.equal(unwrap(src), "- **Why:** one two\n- **It is:** three\n\nA para wraps here.\n\n| a |\n| b |\n```\nx y\n```".replace("x y", "x\ny"));
});

test("a lettered slice (1b) is a slice like any other: its own issue, marker and order", () => {
  const text = brief.replace('  - "2 · The checks (after 1)"', '  - "1b · The chain decision (after 1)"\n  - "2 · The checks (after 1b)"');
  const { goal } = readGoal("design/goals/06-portal.md", text);
  assert.deepEqual(goal.slices.map((s) => [s.number, s.after]), [["1", []], ["1b", ["1"]], ["2", ["1b"]]]);
  const steps = plan({ goals: [goal], state: empty, briefUrl: url });
  assert.ok(steps.some((s) => s.do === "createIssue" && s.key === "slice 6.1b" && s.title === "Goal 6 · 1b · The chain decision"));
  assert.deepEqual(steps.filter((s) => s.do === "addBlockedBy").map((s) => [s.issue, s.blocker]), [["slice 6.1b", "slice 6.1"], ["slice 6.2", "slice 6.1b"]]);
  assert.ok(sliceMarker(6, "1b").includes("slice=6.1b "));
});

test("a slice line it can't read is an error, never a silent drop", () => {
  assert.match(readGoal("design/goals/06-portal.md", brief.replace('"1 · The theme"', '"The theme"')).error, /slice not understood: "The theme"/);
});
