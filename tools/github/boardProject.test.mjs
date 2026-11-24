// node --test tools/github/boardProject.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { boardStatus, boardValues, projectFields, projectPlan } from "./project.mjs";
import { held, rows } from "./fixtures.mjs";

const goal = { number: 17, milestone: "Goal 17: the superagent", release: "beta", status: "running", lead: {} };
test("the Project: Stage, Pulled by and Lane join the fields, the board's items are set and cleared, and no fields change without the board", () => {
  const withBoard = projectFields([goal], rows).map((f) => f.name);
  assert.deepEqual(withBoard.slice(-3), ["Stage", "Pulled by", "Lane"]);
  assert.deepEqual(projectFields([goal]).map((f) => f.name).length, 9);
  assert.deepEqual(projectFields([goal], rows).find((f) => f.name === "Kind").options.map((o) => o.name).slice(-2), ["capability", "grill"]);
  const state = held(rows);
  const steps = projectPlan({ goals: [goal], issues: state.issues.map((i) => ({ ...i, nodeId: `I${i.number}` })), project: null, rows });
  const set = (n, f) => steps.find((s) => s.do === "setValue" && s.number === n && s.field === f)?.value;
  assert.deepEqual([set(100, "Stage"), set(100, "Pulled by"), set(100, "Release"), set(100, "Lane"), set(100, "Kind"), set(100, "Goal")], ["building", "superagent", "beta", "goal-17", "capability", "Goal 17"]);
  assert.equal(set(101, "Status"), "Done");
  assert.ok(!steps.some((s) => s.number === 104 && s.field === "Release"), "a row with no release sets none");
  assert.deepEqual(boardValues(rows[4], { state: "open" }, [goal]).Release, null);
});

test("the Project, run twice: once it holds each board item's fields there is nothing to do", () => {
  const state = held(rows);
  const byId = new Map(rows.map((r) => [r.id, r]));
  const issues = state.issues.map((i) => ({ ...i, nodeId: `I${i.number}` }));
  const fields = projectFields([goal], rows).map((f) => ({ id: `F-${f.name}`, name: f.name, dataType: f.dataType, options: f.options.map((o, k) => ({ id: `${f.name}${k}`, name: o.name })) }));
  const items = rows.map((r, k) => ({ id: `T${k}`, number: 100 + k, values: Object.fromEntries(Object.entries(boardValues(r, issues[k], [goal], { byId, dates: null })).filter(([, v]) => v !== null && v !== undefined)) }));
  const views = projectPlan({ goals: [goal], issues, project: null, rows }).filter((s) => s.do === "createView").map((s, k) => ({ id: `V${k}`, name: s.name, layout: s.layout, filter: s.filter }));
  assert.deepEqual(projectPlan({ goals: [goal], issues, project: { id: "P", fields, items, views }, rows }), []);
});

test("Status (K42, section 5): done when built, running with a lane, ready only when every need is built, else blocked", () => {
  const mk = (id, stage, lane, ...needs) => ({ id, stage, lane, needs });
  const all = [mk("a", "built", null), mk("b", "extracted", null), mk("c", "building", null), mk("d", "provisional", null, "a", "b"), mk("e", "provisional", null, "a", "c"), mk("f", "building", "goal-17", "c"), mk("g", "built", "goal-17", "c")];
  const byId = new Map(all.map((r) => [r.id, r]));
  assert.deepEqual(all.map((r) => boardStatus(r, byId)), ["Done", "Done", "Ready", "Ready", "Blocked", "Running", "Done"]);
});
