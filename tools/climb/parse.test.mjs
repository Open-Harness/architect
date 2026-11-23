// The climb recorder's reader, against a report `ortho prove --report` really wrote (fixtures/prove-report.json: acme with the
// climb fixture's wrong-answer handler planted; only its `lines` are cut short). Run with `node --test tools/climb/*.test.mjs`.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { entries } from "./parse.mjs";

const report = JSON.parse(readFileSync(join(import.meta.dirname, "fixtures/prove-report.json"), "utf8"));
const run = { report, at: "2026-11-19T17:00:00.000Z", commit: "abc", exit: 1, runSeconds: 7.3 };

describe("the climb recorder's reader", () => {
  it("makes one entry per journey with its steps green and total, its own time and the run's", () => {
    assert.deepEqual(entries(run), { ok: true, lines: [{
      at: "2026-11-19T17:00:00.000Z", commit: "abc", journey: "climb: a wrong answer", green: 0, total: 1, seconds: 0.005, run_seconds: 7.3, prove_seconds: 1.049, exit: 1,
    }] });
  });
  it("counts passing steps as green", () => {
    const passing = { ...report, journeys: [{ ...report.journeys[0], steps: [{ verdict: "pass" }, { verdict: "pass" }, { verdict: "fail" }] }] };
    const [entry] = entries({ ...run, report: passing }).lines;
    assert.equal(entry.green, 2);
    assert.equal(entry.total, 3);
  });
  it("says why a journey stopped before any step", () => {
    const stopped = { ...report, journeys: [{ ...report.journeys[0], steps: [], stopped: "the starting world failed" }] };
    assert.deepEqual(entries({ ...run, report: stopped }).lines.map((e) => [e.green, e.total, e.stopped]), [[0, 0, "the starting world failed"]]);
  });
  it("returns a problem, never throws, for a report of a schema it does not know, one with no journeys, or none at all", () => {
    assert.deepEqual(entries({ ...run, report: { ...report, schemaVersion: 2 } }), { ok: false, problem: "prove's report has schemaVersion 2; the recorder reads 1" });
    assert.deepEqual(entries({ ...run, report: { schemaVersion: 1 } }), { ok: false, problem: "prove's report has no journeys list" });
    assert.equal(entries({ ...run, report: undefined }).ok, false);
  });
});
