// Stage 1's first check (Goal 3, `design/goals/03-stage-1-hill-climbed.md`, "The done check": every stage 1 journey is green in `local` and
// `test`). It is the start of `nx run e2e:stage1`; `e2e/project.json` lists what the done check still needs. Written by the checks author; a
// builder never edits this file (AGENTS.md, "Journeys and checks come first").
//
// WHAT IS REQUIRED. On a fresh copy of `examples/plugged-in`, `ortho prove` runs the whole project in each environment and
// - exits 0 and says the run passed;
// - ran exactly Plugged In's seven journeys (the names in support.ts, which `declared()` ties to the journeys folder), each with all its
//   steps green: 7 journeys, 56 steps, and no journey whose starting world stopped;
// - leaves nothing of the copy running (prove runs in a process group of its own; the group and every descendant seen are stopped afterwards,
//   and the check asserts that none is left, as checks 33 and 36 do).
//
// LOCAL reads prove's own report (`--report <file>`, schemaVersion 1, as `tools/climb/record.mjs` does), never its prose.
//
// TEST (`--env test`) cannot be asked for a report today: prove refuses `--json` and `--report` there (exit 2). So the test half is judged on
// prove's exit code, its closing `prove ✔` line, `world destroyed` and its `journey <name> ✔ <n>/<n> steps` lines, read as strictly as a line can
// be (one regex, anchored). It runs in a throwaway git repository (the revision is the commit), against the real test environment (workerd, D1,
// a collector) and the real logbook, with the local OIDC issuer of `e2e/layer2/services.ts` signing the verdicts: no credential of anyone's is
// used or needed, so it runs the same on a Mac and in CI. Pinning behaviour on data rather than prose is the second test of the test group,
// "`--env test` reports its run as data": it asks for `--report` and is on the ratchet list (`expected-failing/01-plugged-in-journeys.txt`) until
// a builder gives test a report.
//
// THE CONTROLS plant each hollow reading against `journeyProblems`: a missing journey, an extra one, a repeated one, a short or long step count,
// a red step, and a journey that stopped. Each must be refused.
//
// No Docker. The test environment and the logbook take ports picked free per run (`e2e/ports.ts`); local prove uses port 0.
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { copyOf } from "../layer1/support.ts";
import { initGit } from "../layer2/support.ts";
import { finish, startStack, type Stack } from "../layer2/services.ts";
import { JOURNEYS, STEPS, declared, journeyProblems, leftRunning, pluggedIn, plain, proveOnce } from "./support.ts";

const HARD_STOP_SECONDS = 600;
const reports = mkdtempSync(join(tmpdir(), "ortho-stage1-"));

const copies: Array<ReturnType<typeof copyOf>> = [];
afterEach(async () => {
  const roots = copies.splice(0);
  for (const copy of roots) { const left = await leftRunning(copy.root); copy.remove(); expect(left, "something of the copy is still running").toEqual([]); }
});
const fresh = () => { const copy = copyOf(pluggedIn); copies.push(copy); return copy; };

describe("the journeys file and the expectation agree", () => {
  it("Plugged In declares exactly as many journeys as the check expects", () => {
    expect(declared().length).toBe(Object.keys(JOURNEYS).length);
    expect(STEPS).toBe(56);
  });
});

describe("controls: journeyProblems refuses each hollow reading", () => {
  const good = Object.entries(JOURNEYS).map(([name, total]) => ({ name, green: total, total }));
  it("accepts the real thing", () => expect(journeyProblems(good)).toEqual([]));
  it("refuses a missing, an extra and a repeated journey", () => {
    expect(journeyProblems(good.slice(1))).not.toEqual([]);
    expect(journeyProblems([...good, { name: "something else", green: 1, total: 1 }])).not.toEqual([]);
    expect(journeyProblems([...good, good[0]!])).not.toEqual([]);
  });
  it("refuses a short count, a long count and a red step, and a journey that ran no step", () => {
    expect(journeyProblems(good.map((j, i) => i === 0 ? { ...j, green: j.total - 1, total: j.total - 1 } : j))).not.toEqual([]);
    expect(journeyProblems(good.map((j, i) => i === 0 ? { ...j, green: j.total + 1, total: j.total + 1 } : j))).not.toEqual([]);
    expect(journeyProblems(good.map((j, i) => i === 0 ? { ...j, green: j.total - 1 } : j))).not.toEqual([]);
    expect(journeyProblems(good.map((j, i) => i === 0 ? { ...j, green: 0, total: 0 } : j))).not.toEqual([]);
  });
});

describe("--env local", () => {
  it("every journey is green: 7 journeys, 56 steps, read from prove's report", { timeout: 660_000 }, async () => {
    const copy = fresh();
    const ended = await proveOnce(copy.root, ["--env", "local"], { hardStopSeconds: HARD_STOP_SECONDS, report: join(reports, "local.json") });
    const out = plain(ended.out);
    expect(ended.hung, "prove still running at the hard stop").toBe(false);
    expect(ended.report, `prove wrote no readable report:\n${out.slice(-3000)}`).toBeDefined();
    const report = ended.report as { schemaVersion: number; passed: boolean; totals: Record<string, number>; journeys: Array<{ name: string; stopped?: string; steps: Array<{ verdict: string }> }> };
    expect(report.schemaVersion).toBe(1);
    const seen = report.journeys.map((j) => ({ name: j.name, green: j.steps.filter((s) => s.verdict === "pass").length, total: j.steps.length }));
    const problems = [
      ...journeyProblems(seen),
      ...report.journeys.filter((j) => j.stopped !== undefined).map((j) => `journey "${j.name}" stopped: ${j.stopped}`),
      ...(report.totals["journeys"] === Object.keys(JOURNEYS).length && report.totals["steps"] === STEPS ? [] : [`totals say ${report.totals["journeys"]} journeys, ${report.totals["steps"]} steps; expected ${Object.keys(JOURNEYS).length}, ${STEPS}`]),
      ...(report.totals["stepsPassed"] === STEPS && report.totals["journeysPassed"] === Object.keys(JOURNEYS).length ? [] : [`${report.totals["stepsPassed"]} steps and ${report.totals["journeysPassed"]} journeys passed`]),
      ...(report.passed ? [] : ["the report says the run did not pass"]),
      ...(ended.status === 0 ? [] : [`exit status ${ended.status}`]),
    ];
    expect(problems, `${problems.join("\n")}\n--- prove said (tail):\n${out.slice(-2500)}`).toEqual([]);
    console.log(`local: ${seen.filter((j) => j.green === j.total).length}/${seen.length} journeys, ${report.totals["stepsPassed"]}/${report.totals["steps"]} steps, ${ended.seconds.toFixed(1)} s`);
  });
});

describe("--env test", () => {
  let stack: Stack | undefined;
  let root: string;
  let remove: () => void;
  beforeAll(async () => {
    const copy = copyOf(pluggedIn);
    root = copy.root;
    remove = copy.remove;
    initGit(root);
    stack = await startStack(root, 1);
  }, 600_000);
  afterAll(async () => {
    try { try { stack?.down("test"); } catch { /* it was never up */ } await finish(root, stack); } finally { remove?.(); }
  }, 300_000);

  it("every journey is green: 7 journeys, 56 steps, in a world of the test environment", { timeout: 660_000 }, async () => {
    const ended = await proveOnce(root, ["--env", "test"], { env: stack!.env, hardStopSeconds: HARD_STOP_SECONDS });
    const lines = plain(ended.out).split("\n").map((l) => l.trimEnd());
    expect(ended.hung, "prove still running at the hard stop").toBe(false);
    const seen = lines.flatMap((line) => {
      const m = line.match(/^journey (.+) [✔✘] (\d+)\/(\d+) steps$/);
      return m ? [{ name: m[1]!, green: Number(m[2]), total: Number(m[3]) }] : [];
    });
    const problems = [
      ...journeyProblems(seen),
      ...(ended.status === 0 ? [] : [`exit status ${ended.status}`]),
      ...(lines.includes("prove ✔") ? [] : ["no closing `prove ✔` line"]),
      ...(lines.at(-1) === "world destroyed" || lines.includes("world destroyed") ? [] : ["the test world was not destroyed"]),
    ];
    expect(problems, `${problems.join("\n")}\n--- prove said (tail):\n${lines.slice(-40).join("\n")}`).toEqual([]);
    console.log(`test: ${seen.filter((j) => j.green === j.total).length}/${seen.length} journeys, ${seen.reduce((a, j) => a + j.green, 0)}/${seen.reduce((a, j) => a + j.total, 0)} steps, ${ended.seconds.toFixed(1)} s`);
  });

  it("`--env test` reports its run as data", { timeout: 300_000 }, async () => {
    // Today prove refuses `--report` in test ("--json and --report require --env local", exit 2). Required: it accepts it and writes a schemaVersion 1 report of the same
    // seven journeys, so a tool never has to read prose. On the ratchet list until a builder does it.
    const ended = await proveOnce(root, ["--env", "test"], { env: stack!.env, hardStopSeconds: HARD_STOP_SECONDS, report: join(reports, "test.json") });
    expect(ended.status, plain(ended.out).slice(-1500)).toBe(0);
    const report = ended.report as { schemaVersion: number; journeys: Array<{ name: string; steps: Array<{ verdict: string }> }> } | undefined;
    expect(report?.schemaVersion).toBe(1);
    const seen = (report?.journeys ?? []).map((j) => ({ name: j.name, green: j.steps.filter((s) => s.verdict === "pass").length, total: j.steps.length }));
    expect(journeyProblems(seen)).toEqual([]);
  });
});
