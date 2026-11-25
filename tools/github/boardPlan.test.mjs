// node --test tools/github/boardPlan.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { APP_MILESTONES, NOT_YET_NEEDED } from "./board.mjs";
import { boardPlan, FORECAST_NOTE, itemMarker, issueOfRow } from "./boardPlan.mjs";
import { LABELS, typeOf } from "./plan.mjs";
import { empty, held, plan, rows, url } from "./fixtures.mjs";

test("from nothing: the lane label, every milestone, an issue per row in the first milestone that pulls it, the built ones closed", () => {
  const steps = plan(rows, empty);
  assert.deepEqual(steps.filter((s) => s.do === "createLabel").map((s) => s.name), ["lane:goal-17"]);
  assert.deepEqual(steps.filter((s) => s.do === "createMilestone").map((s) => s.title), [...Object.values(APP_MILESTONES).map((m) => m.title), NOT_YET_NEEDED]);
  const issues = steps.filter((s) => s.do === "createIssue");
  assert.equal(issues.length, rows.length);
  const secrets = issues.find((s) => s.key === "item secrets");
  assert.deepEqual([secrets.title, secrets.milestone, secrets.type], ["Secrets by declaration", "Superagent: the coding agent end to end", "Capability"]);
  assert.deepEqual(secrets.labels, ["kind:capability", "release:beta", "lane:goal-17"]);
  assert.ok(secrets.body.startsWith(itemMarker("secrets")) && secrets.body.includes("**Touches:** `packages/host-cloudflare`"));
  assert.equal(issues.find((s) => s.key === "item gap-node-host").milestone, NOT_YET_NEEDED);
  assert.equal(issues.find((s) => s.key === "item gap-node-host").type, "Gap");
  assert.deepEqual(issues.find((s) => s.key === "item reports").labels, ["kind:capability", "release:beta"]);
  assert.deepEqual(steps.filter((s) => s.do === "closeIssue").map((s) => s.issue), ["item things"], "a built row's issue is closed");
});

test("run twice: once GitHub holds every row, there is nothing to do, even with other labels on an issue", () => {
  const state = held(rows);
  assert.deepEqual(plan(rows, state), []);
  state.issues[0].labels.push("harness:amp");
  assert.deepEqual(plan(rows, state), [], "a label the board does not own is left alone");
});

test("a row that changed: the issue is rewritten, its labels and milestone moved, and it is closed when built", () => {
  const state = held(rows);
  const moved = rows.map((r) => (r.id === "secrets" ? { ...r, stage: "built", lane: null, release: "1.0", milestone: "launch" } : r));
  state.issues[0].labels.push("harness:amp");
  const [step, ...rest] = plan(moved, state);
  assert.equal(rest.length, 0);
  assert.deepEqual([step.do, step.number, step.state, step.milestone], ["updateIssue", 100, "closed", "Superagent: launch"]);
  assert.deepEqual(step.labels, ["harness:amp", "kind:capability", "release:1.0"], "its own labels stay; the lane is dropped");
  assert.ok(step.body.includes("**Stage:** built"));
});

test("a built row reopened when its stage goes back, and a stray copy or an outsider's issue is never taken for the row's", () => {
  const state = held(rows);
  const back = rows.map((r) => (r.id === "things" ? { ...r, stage: "building" } : r));
  assert.deepEqual(plan(back, state).map((s) => [s.number, s.state]), [[101, "open"]]);
  const dup = { ...state.issues[1], number: 500, trusted: true };
  assert.equal(issueOfRow(rows[1], [dup, state.issues[1]]).number, 101, "the oldest wins");
  assert.equal(issueOfRow(rows[1], [{ ...state.issues[1], trusted: false }]), undefined);
  assert.equal(issueOfRow(rows[1], [{ ...state.issues[1], pullRequest: true }]), undefined);
  assert.equal(issueOfRow(rows[1], [{ ...state.issues[1], labels: [] }]), undefined, "an issue without a board kind is not the row's");
});

test("the beta label says the beta of K42, and the board's kind has a label and an issue type", () => {
  assert.equal(LABELS.find((l) => l.name === "release:beta").description, "Ships in the beta: the framework Capxul's books, HR and payroll prove (K44)");
  assert.ok(LABELS.some((l) => l.name === "kind:capability"));
  assert.equal(typeOf("capability", { ownerType: "User" }), "Task");
});

test("a milestone's due date is written when it differs, and not for 'Not yet needed'", () => {
  const state = { ...empty, milestones: [{ number: 1, title: "Capxul: the books", description: "x", dueOn: "2026-12-01" }] };
  const steps = boardPlan({ rows: [], state, statusUrl: url, typeOf, due: { "Capxul: the books": "2026-12-01", "Capxul: banking": "2026-12-09", [NOT_YET_NEEDED]: "2027-01-01" } });
  assert.deepEqual(steps.filter((s) => s.do === "setMilestoneDue"), [{ do: "setMilestoneDue", title: "Capxul: banking", day: "2026-12-09" }]);
});

test("a board milestone left with no dated row loses its old due date (K45)", () => {
  const state = { ...empty, milestones: [{ number: 7, title: "Superagent: launch", description: "x", dueOn: "2026-12-20" }, { number: 8, title: "Capxul: the books", description: "x", dueOn: null }] };
  const steps = boardPlan({ rows: [], state, statusUrl: url, typeOf, due: {} });
  assert.deepEqual(steps.filter((s) => s.do === "setMilestoneDue"), [{ do: "setMilestoneDue", title: "Superagent: launch", day: null }]);
});

test("a milestone that gets a due date says it is a forecast, and has the note only then", () => {
  const due = { "Capxul: banking": "2026-12-09" };
  const steps = plan([], empty, due);
  const by = (t) => steps.find((s) => s.do === "createMilestone" && s.title === t).description;
  assert.ok(by("Capxul: banking").endsWith(FORECAST_NOTE));
  assert.ok(!by("Capxul: the books").includes("Forecast"));
  assert.match(FORECAST_NOTE, /Forecast, recomputed every run \(K42 §5\)/);
  const state = { ...empty, milestones: [{ number: 1, title: "Capxul: banking", description: by("Capxul: banking"), dueOn: "2026-12-09" }] };
  assert.deepEqual(plan([], state, due).filter((s) => s.title === "Capxul: banking"), [], "settled once written");
});
