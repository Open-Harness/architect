// node --test tools/github/climb.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { capabilityPoints, changesOnly, checkFiles, countRed, lanesOf, slicePoints } from "./climb.mjs";

test("a check file is red when its own expected-failing list holds a key; a stale list or the graphs' file never counts", () => {
  const files = [
    { file: "m1/01-a.test.ts" },
    { file: "m1/02-b.test.ts" },
    { file: "m1/40-m1-50-graph.test.ts" },
    { file: "m1/expected-failing/02-b.txt", text: "# why\nm1/02-b.test.ts > x > y\n" },
    { file: "m1/expected-failing/40-m1-50-graph.txt", text: "m1/40-m1-50-graph.test.ts > z\n" },
    { file: "m1/expected-failing/09-gone.txt", text: "m1/09-gone.test.ts > z\n" },
    { file: "m2/expected-failing/01-c.txt", text: "# every key came off\n" },
    { file: "m2/01-c.test.ts" },
    { file: "superagent/01-d.test.ts" },
  ];
  const by = checkFiles(files, (f) => f.text ?? "");
  assert.deepEqual([by.m1, by.m2], [{ all: 2, red: 1 }, { all: 1, red: 0 }]);
  assert.equal(by.superagent, undefined, "only the alpha's suites");
  assert.equal(countRed("# why it fails\nm1/a.test.ts > x > a\n\nm1/a.test.ts > x > b\n"), 2);
});

test("each row climbs in the build its milestone names: the alpha's, or Capxul's path; the rest in neither", () => {
  const rows = [
    { id: "a", milestone: "alpha", stage: "built" },
    { id: "b", milestone: "books", stage: "building" },
    { id: "c", milestone: "getting paid", stage: "provisional" },
    { id: "d", milestone: null, stage: "spiked" },
    { id: "e", milestone: "coding agent", stage: "spiked" },
  ];
  assert.deepEqual([...lanesOf(rows)], [["a", "alpha"], ["b", "Capxul"], ["c", "Capxul"]]);
});

test("a page's points: a count per stage and the progress weighted by stage; a row not on the page is provisional", () => {
  const lanes = new Map([["a", "alpha"], ["b", "alpha"], ["c", "Capxul"]]);
  const points = capabilityPoints("2026-11-24T00:00:00Z", lanes, [{ id: "a", stage: "built" }, { id: "b", stage: "building" }]);
  const v = (lane, series) => points.find((p) => p.lane === lane && p.series === series).value;
  assert.deepEqual([v("alpha", "built"), v("alpha", "building"), v("alpha", "progress")], [1, 1, 80]);
  assert.deepEqual([v("Capxul", "provisional"), v("Capxul", "progress")], [1, 0]);
});

test("slices: Goal 18's from slice 4 are the alpha's, Goal 16's are Capxul's, done and open after each event", () => {
  const issues = [
    { number: 1, title: "Goal 18 · 2 · The board", state: "closed", created_at: "2026-11-23T00:00:00Z", closed_at: "2026-11-24T00:00:00Z" },
    { number: 2, title: "Goal 18 · 4 · The board re-sorted", state: "closed", created_at: "2026-11-25T00:00:00Z", closed_at: "2026-11-26T00:00:00Z" },
    { number: 3, title: "Goal 16 · 7 · The books", state: "open", created_at: "2026-11-23T00:00:00Z", closed_at: null },
  ];
  const { points, items } = slicePoints(issues);
  assert.deepEqual(items.map((i) => [i.id, i.lane, i.status]), [["#2", "alpha", "done"], ["#3", "Capxul", "open"]]);
  const last = (lane, series) => points.filter((p) => p.lane === lane && p.series === series).at(-1).value;
  assert.deepEqual([last("alpha", "done"), last("alpha", "open"), last("Capxul", "open")], [1, 0, 1]);
});

test("a point that repeats the one before it in its series is dropped", () => {
  const p = (at, value) => ({ at, lane: "alpha", dimension: "tests", series: "passing", value });
  assert.deepEqual(changesOnly([p("1", 5), p("2", 5), p("3", 6)]).map((x) => x.at), ["1", "3"]);
});
