// node --test tools/github/project.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { itemValues, projectFields, projectPlan, projectViews } from "./project.mjs";

const goal = { number: 6, milestone: "Goal 6: the new portal", release: "beta", status: "running", lead: { harness: "amp", model: "claude-opus-5-5", since: "2026-11-22" } };
const issues = [
  { number: 10, nodeId: "I10", labels: ["kind:goal", "goal-6"], milestone: goal.milestone, state: "open" },
  { number: 11, nodeId: "I11", labels: ["kind:slice"], milestone: goal.milestone, state: "closed", createdAt: "2026-11-21T10:00:00Z", closedAt: "2026-11-23T09:00:00Z" },
  { number: 12, nodeId: "I12", labels: ["kind:slice", "harness:codex"], milestone: goal.milestone, state: "open" },
  { number: 13, nodeId: "I13", labels: ["kind:slice"], milestone: goal.milestone, state: "open", blockedBy: [12] },
  { number: 14, nodeId: "I14", labels: ["kind:snag"], milestone: goal.milestone, state: "open", trusted: false },
  { number: 15, nodeId: "I15", labels: ["kind:slice"], milestone: goal.milestone, pullRequest: true },
  { number: 16, nodeId: "I16", labels: [], milestone: goal.milestone, state: "open" },
];

test("each item's fields: the goal from its front matter, a slice from its state, labels and links", () => {
  assert.deepEqual(itemValues(issues[0], goal, issues), { Goal: "Goal 6", Kind: "goal", Status: "Running", Release: "beta", Harness: "amp", Model: "claude-opus-5-5", "Lead role": "lead", Start: "2026-11-22", End: null });
  assert.deepEqual([itemValues(issues[1], goal, issues).Start, itemValues(issues[1], goal, issues).End], ["2026-11-21", "2026-11-23"]);
  assert.equal(itemValues(issues[1], goal, issues).Status, "Done");
  assert.equal(itemValues(issues[2], goal, issues).Status, "Running");
  assert.equal(itemValues(issues[3], goal, issues).Status, "Blocked");
  assert.equal(itemValues(issues[2], goal, issues).Model, undefined, "a slice's model is never overwritten");
});

test("from nothing: the Project, linked, its fields and views; only trusted, kind-labelled issues become items", () => {
  const steps = projectPlan({ goals: [goal], issues, project: null });
  assert.deepEqual(steps.slice(0, 2).map((s) => s.do), ["createProject", "linkRepository"]);
  assert.deepEqual(steps.filter((s) => s.do === "createField").map((s) => s.name), ["Goal", "Kind", "Status", "Release", "Harness", "Model", "Lead role", "Start", "End"]);
  assert.deepEqual(steps.filter((s) => s.do === "addItem").map((s) => s.number), [10, 11, 12, 13]);
  assert.deepEqual(steps.filter((s) => s.do === "createView").map((s) => [s.name, s.layout, s.filter]), [
    ["All goals", "TABLE_LAYOUT", ""], ["By status", "BOARD_LAYOUT", ""], ["Roadmap", "ROADMAP_LAYOUT", ""], ["Goal 6", "TABLE_LAYOUT", 'goal:"Goal 6"'],
  ]);
});

const opts = (field) => field.options.map((o, k) => ({ id: `${field.name}-${k}`, name: o.name }));
const full = () => {
  const fields = projectFields([goal]).map((f) => ({ id: `F-${f.name}`, name: f.name, dataType: f.dataType, options: opts(f) }));
  const tracked = issues.slice(0, 4);
  return {
    id: "P",
    fields,
    items: tracked.map((i) => ({ id: `T${i.number}`, number: i.number, values: Object.fromEntries(Object.entries(itemValues(i, goal, issues)).filter(([, v]) => v !== null && v !== undefined)) })),
    views: projectViews([goal]).map((v, k) => ({ id: `V${k}`, ...v })),
  };
};

test("run twice: once the Project holds it all, there is nothing to do", () => {
  assert.deepEqual(projectPlan({ goals: [goal], issues, project: full() }), []);
});

test("a new Project's built-in Status and View 1 become ours, and a value that changed is set again", () => {
  const project = full();
  project.fields = project.fields.map((f) => (f.name === "Status" ? { ...f, options: [{ id: "s1", name: "Todo" }, { id: "s2", name: "In Progress" }, { id: "s3", name: "Done" }] } : f));
  project.views = [{ id: "V1", name: "View 1", layout: "TABLE_LAYOUT", filter: "" }, ...project.views.filter((v) => v.name !== "All goals")];
  project.items[2].values.Harness = "amp";
  const steps = projectPlan({ goals: [goal], issues, project });
  const status = steps.find((s) => s.do === "updateField" && s.name === "Status");
  assert.deepEqual(status.options.map((o) => o.name), ["Ready", "Running", "Blocked", "Landing", "Done", "Parked"]);
  assert.equal(status.options.find((o) => o.name === "Done").id, "s3", "Done keeps its id, so its items keep their value");
  assert.ok(steps.some((s) => s.do === "updateView" && s.id === "V1" && s.name === "All goals"));
  assert.ok(!steps.some((s) => s.do === "createView"));
  assert.ok(steps.some((s) => s.do === "setValue" && s.number === 12 && s.field === "Harness" && s.value === "codex"));
});

test("a slice parked by hand stays parked while open, and is Done once closed", () => {
  const project = full();
  project.items[3].values.Status = "Parked";
  assert.ok(!projectPlan({ goals: [goal], issues, project }).some((s) => s.number === 13 && s.field === "Status"));
});
