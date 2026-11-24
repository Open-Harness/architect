// Check 18 (slice 6): the way checks 19 reads `ortho prove`'s report is itself sound. Nothing here runs prove. It plants, on a
// report shaped as prove writes it, each hollow reading a journey check could be passed by (a journey that did not run, ran
// twice, stopped, ran fewer or other steps than its file says, or had a red step) and shows each is named, with the journey and
// the step; and it shows the fixtures hold the journeys the other checks expect, with the steps they expect.
import { describe, expect, it } from "vitest";
import { DOORS, WANTED, journeyFile, problemsOf, titlesOf, type JourneyRun, type Wanted } from "./stage-one.ts";

const want: Wanted = WANTED[0]!;
const green = (w: Wanted): JourneyRun => ({
  name: w.name, verdict: "pass",
  steps: titlesOf(journeyFile(w.file)).map((name) => ({ name, verdict: "pass", failures: [] })),
});

describe("18 reading prove: the fixtures", () => {
  it("each journey file has the steps the check expects, each with a title", () => {
    for (const w of [...WANTED, ...DOORS]) {
      const titles = titlesOf(journeyFile(w.file, w.dir));
      expect(titles.length, w.file).toBe(w.steps);
      if (w.dir === undefined) expect(new Set(titles).size, `${w.file}: two steps share a title`).toBe(titles.length);
      expect(titles.every((t) => t.length > 10), `${w.file}: a step has no real title`).toBe(true);
    }
  });

  it("each journey file declares the name the check expects", () => {
    for (const w of [...WANTED, ...DOORS]) expect(journeyFile(w.file, w.dir), w.file).toContain(`Blueprint.journey("${w.name}"`);
  });
});

describe("18 reading prove: controls, each hollow reading is refused", () => {
  it("accepts the real thing: ran once, every step green, in order", () => {
    expect(problemsOf([green(want)], want)).toEqual([]);
  });

  it("refuses a journey that did not run, and one that ran twice", () => {
    expect(problemsOf([], want)).toEqual([`journey "${want.name}" did not run`]);
    expect(problemsOf([green(want), green(want)], want)[0]).toMatch(/ran 2 times/);
    expect(problemsOf([{ ...green(want), name: "another journey" }], want)).toEqual([`journey "${want.name}" did not run`]);
  });

  it("refuses a journey whose starting world stopped, naming why", () => {
    const stopped: JourneyRun = { name: want.name, verdict: "fail", stopped: "starting world X: agent.open died: BlankReached", steps: [] };
    expect(problemsOf([stopped], want)).toEqual([`journey "${want.name}" stopped before its first step: starting world X: agent.open died: BlankReached`]);
    // prove's own line carries the cause the report's `stopped` cuts, so it is the one said
    const withLine = problemsOf([{ ...stopped, stopped: "starting world X: agent.open died: null", line: "journey j ✘ starting world X: agent.open died: null (BlankReached: agent.open is not written yet)" }], want);
    expect(withLine[0]).toContain("BlankReached");
  });

  it("refuses a journey that ran fewer steps, more steps, other steps or the right steps in another order", () => {
    const g = green(want);
    expect(problemsOf([{ ...g, steps: g.steps.slice(0, -1) }], want)[0]).toMatch(/ran steps/);
    expect(problemsOf([{ ...g, steps: [...g.steps, g.steps[0]!] }], want)[0]).toMatch(/ran steps/);
    expect(problemsOf([{ ...g, steps: g.steps.map((s, i) => (i === 0 ? { ...s, name: "something else" } : s)) }], want)[0]).toMatch(/ran steps/);
    expect(problemsOf([{ ...g, steps: [g.steps[1]!, g.steps[0]!, ...g.steps.slice(2)] }], want)[0]).toMatch(/ran steps/);
    expect(problemsOf([{ ...g, steps: [] }], want)[0]).toMatch(/ran steps/);
  });

  it("names the journey, the step, what was expected and what came back for a red step", () => {
    const g = green(want);
    const red: JourneyRun = {
      ...g, verdict: "fail",
      steps: g.steps.map((s, i) => (i === 2 ? { ...s, verdict: "fail", failures: [{ message: "answer 1n doesn't match 2n", expected: "2n", got: "1n" }] } : s)),
    };
    const problems = problemsOf([red], want);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain(`journey "${want.name}"`);
    expect(problems[0]).toContain(`step "${g.steps[2]!.name}"`);
    expect(problems[0]).toContain("expected 2n, got 1n");
  });

  it("refuses a step that is marked failed with no reason, and a reason on a step marked passed", () => {
    const g = green(want);
    expect(problemsOf([{ ...g, steps: g.steps.map((s, i) => (i === 0 ? { ...s, verdict: "fail" } : s)) }], want)[0]).toMatch(/failed with no reason/);
    expect(problemsOf([{ ...g, steps: g.steps.map((s, i) => (i === 0 ? { ...s, failures: [{ message: "x" }] } : s)) }], want)).not.toEqual([]);
  });

  it("refuses an expectation that has drifted from its journey file", () => {
    expect(problemsOf([green(want)], { ...want, steps: want.steps + 1 })[0]).toMatch(/the journey file has/);
  });

  it("reads each title as the journey writes it", () => {
    expect(titlesOf(`s.step(\n  "a, b: c",\n  call)\n s.step("d \\"quoted\\"", call)`)).toEqual(["a, b: c", 'd "quoted"']);
  });
});
