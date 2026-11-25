// node --test tools/github/climb.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { capabilityPoints, changesOnly, countRed, countTests, lanesOf, slicePoints } from "./climb.mjs";

test("a test is a test( or it( call, with its modifiers; a red list's keys skip comments and blanks", () => {
  const file = 'describe("x", () => {\n  test("a", () => {});\n  it.skip("b", () => {});\n  test.each([1, 2])("c %s", () => {});\n  // test("not a call")\n  const atest = 1;\n});\n';
  assert.equal(countTests(file), 3);
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
