// node --test tools/github/roadmap.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays, forecast, milestoneDue, pace, perItem, rowDates } from "./roadmap.mjs";
import { pause, withRetry } from "./pace.mjs";

const mk = (id, stage, milestone = null, lane = null, ...needs) => ({ id, stage, milestone, lane, needs });
const today = "2026-11-23";

test("the pace is the merges per day over the seven full days before today, today left out", () => {
  const days = ["2026-11-15", "2026-11-16", "2026-11-19", "2026-11-20", "2026-11-20", "2026-11-21", "2026-11-22", "2026-11-22", "2026-11-22", "2026-11-23", "2026-11-23"];
  assert.equal(pace(days, today), 8 / 7, "the 15th is before the window, the 23rd is today");
  assert.equal(addDays("2026-11-30", 2), "2026-12-02");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
});

test("the work an item takes is the pull requests merged so far over the progress the rows show", () => {
  const rows = [mk("a", "built"), mk("b", "building"), mk("c", "provisional")];
  assert.equal(perItem(160, rows), 160 / 1.6);
  assert.equal(perItem(0, []), 1, "never zero, never a division by nothing");
});

test("dependency order: an item starts the day after everything it needs ends", () => {
  const rows = [mk("a", "provisional", "coding agent"), mk("b", "provisional", "coding agent", null, "a"), mk("c", "provisional", "coding agent", null, "b")];
  const f = forecast({ rows, today, pace: 10, perItem: 10, width: 1 });
  // a takes the whole day's pace (10 of 10), so a ends on day 0, b on day 1, c on day 2.
  assert.deepEqual([f.a, f.b, f.c], [{ start: "2026-11-23", end: "2026-11-23" }, { start: "2026-11-24", end: "2026-11-24" }, { start: "2026-11-25", end: "2026-11-25" }]);
});

test("parallel items share the day's pace, capped at 1/width each, the superagent's before Capxul's", () => {
  const rows = [mk("sa", "provisional", "coding agent"), mk("cx", "provisional", "getting paid"), mk("cx2", "provisional", "books")];
  const f = forecast({ rows, today, pace: 4, perItem: 4, width: 4 });
  // each item may take 1 pull request a day, so all three run at once and end on day 3.
  assert.deepEqual(Object.values(f).map((d) => d.end), ["2026-11-26", "2026-11-26", "2026-11-26"]);
  const scarce = forecast({ rows, today, pace: 1, perItem: 1, width: 1 });
  assert.deepEqual([scarce.sa.end, scarce.cx.end, scarce.cx2.end], ["2026-11-23", "2026-11-24", "2026-11-25"], "the superagent's milestone first, then Capxul's in order");
});

test("a row a milestone needs is scheduled first, but only milestone rows are returned; a done need costs nothing", () => {
  const rows = [mk("fw", "provisional"), mk("done", "built"), mk("app", "provisional", "coding agent", null, "fw", "done"), mk("idle", "provisional")];
  const f = forecast({ rows, today, pace: 4, perItem: 4, width: 1 });
  assert.deepEqual(Object.keys(f), ["app"], "no date for a piece no app pulled, and none for one that is only needed");
  assert.equal(f.app.start, "2026-11-24", "it starts when fw ended, the day before");
  assert.equal(f.app.end, "2026-11-24");
});

test("a started row keeps its real start; the stage lowers what is left; no pace means no forecast", () => {
  const rows = [mk("a", "building", "books"), mk("b", "provisional", "books")];
  const f = forecast({ rows, started: { a: "2026-11-20" }, today, pace: 10, perItem: 10, width: 1 });
  assert.deepEqual(f.a, { start: "2026-11-20", end: "2026-11-23" }, "four tenths of the work left, done on the first day");
  assert.equal(f.b.end, "2026-11-24");
  assert.deepEqual(forecast({ rows, today, pace: 0, perItem: 10 }), { a: null, b: null });
});

test("dates: done rows keep what happened, open milestone rows are forecast, the rest have none; a milestone's due is its last end", () => {
  const rows = [mk("done", "built", "books"), mk("open", "building", "books"), mk("later", "provisional", "banking"), mk("free", "provisional")];
  const forecasts = forecast({ rows, today, pace: 10, perItem: 10, width: 1 });
  const dates = rowDates({ rows, facts: { done: { start: "2026-11-20", end: "2026-11-22" }, open: { start: "2026-11-21" } }, forecasts });
  assert.deepEqual(dates.done, { start: "2026-11-20", end: "2026-11-22" });
  assert.equal(dates.open.start, "2026-11-21");
  assert.ok(dates.open.end >= today);
  assert.equal(dates.free, undefined);
  const due = milestoneDue(rows, dates, (r) => `M ${r.milestone}`);
  assert.deepEqual(Object.keys(due).sort(), ["M banking", "M books"]);
  assert.equal(due["M books"], dates.open.end > "2026-11-22" ? dates.open.end : "2026-11-22");
  assert.equal(due["M banking"], dates.later.end);
});

test("the same input forecasts the same dates (it is pure)", () => {
  const rows = [mk("a", "provisional", "coding agent"), mk("b", "spiked", "books", null, "a")];
  assert.deepEqual(forecast({ rows, today, pace: 7, perItem: 12 }), forecast({ rows, today, pace: 7, perItem: 12 }));
});

test("pacing: a rate-limited write waits and tries again, any other failure stops at once, and a pause is a real wait", () => {
  const waits = [];
  let calls = 0;
  const flaky = () => {
    calls++;
    if (calls < 3) throw Object.assign(new Error("x"), { stderr: "HTTP 403: You have exceeded a secondary rate limit" });
    return "ok";
  };
  assert.equal(withRetry(flaky, { sleep: (ms) => waits.push(ms), tries: 4, waitMs: 1000 }), "ok");
  assert.deepEqual(waits, [1000, 2000], "each wait is longer than the last");
  assert.throws(() => withRetry(() => { throw Object.assign(new Error("gone"), { stderr: "HTTP 404" }); }, { sleep: () => assert.fail("no wait for a 404") }), /gone/);
  assert.throws(() => withRetry(() => { throw Object.assign(new Error("limit"), { stderr: "rate limit" }); }, { sleep: () => {}, tries: 2 }), /limit/);
  const t = Date.now();
  pause(30);
  assert.ok(Date.now() - t >= 25);
});

import { factsOf } from "./roadmap.mjs";
test("facts: Start is the earlier of the lane's first day and the first evidence merge; End only for a done row; issues are ignored", () => {
  const rows = [
    { ...mk("a", "built"), evidence: "#10, #12; `issue #11`; #99 (open)" },
    { ...mk("b", "building", "books", "goal-16"), evidence: "#20" },
    { ...mk("c", "provisional"), evidence: "no pull request" },
  ];
  const merged = [{ number: 10, day: "2026-11-21" }, { number: 12, day: "2026-11-22" }, { number: 20, day: "2026-11-22" }];
  assert.deepEqual(factsOf({ rows, merged, laneSince: { b: "2026-11-23" } }), {
    a: { start: "2026-11-21", end: "2026-11-22" },
    b: { start: "2026-11-22", end: null },
    c: { start: null, end: null },
  });
  assert.equal(factsOf({ rows: [rows[1]], merged: [], laneSince: { b: "2026-11-23" } }).b.start, "2026-11-23");
});

test("the superagent's milestones run in order, skipping an empty one; a claimed row starts today", () => {
  const rows = [mk("a", "provisional", "coding agent"), mk("b", "provisional", "extraction"), mk("c", "provisional", "launch"), mk("p", "provisional", "books"), mk("q", "provisional", "banking")];
  const f = forecast({ rows, today, pace: 4, perItem: 4, width: 1 });
  assert.deepEqual([f.a.end, f.b.start, f.b.end, f.c.start, f.c.end], ["2026-11-23", "2026-11-24", "2026-11-24", "2026-11-25", "2026-11-25"]);
  // Capxul's two milestones share the pace and do not wait on each other: with room to spare they end the same day.
  assert.equal(forecast({ rows: rows.slice(3), today, pace: 8, perItem: 4, width: 2 }).p.end, forecast({ rows: rows.slice(3), today, pace: 8, perItem: 4, width: 2 }).q.end);
  const claimed = forecast({ rows: [mk("x", "provisional", "coding agent"), mk("y", "provisional", "coding agent", "goal-17", "x")], today, pace: 4, perItem: 4, width: 1 });
  assert.equal(claimed.y.start, today, "it has a lane, so it is under way even while it waits");
});
