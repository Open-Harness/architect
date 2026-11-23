// Check 19 (slice 6): stage one's journeys, run by `ortho prove` on a copy of examples/superagent with its handlers as they are.
// Each is a story told in declared operations (policy versions, accounts, a trigger stored once, the gate, an eval's batch, the
// stage read); every step must pass. Written before slice 7 builds the handlers, so every one is red today, on the empty handler
// (a starting world that stops on `agent.open`, or a step that dies with `BlankReached`), and slice 7 makes them pass.
//
// One prove run serves all six journeys (the copy, `ortho generate` and prove are a minute each on a loaded Mac). Each journey is
// read from prove's report: it ran once, did not stop, ran exactly the steps its file lists, in order, and each step passed. A
// failing step is named with the journey, the step, what was expected and what came back. `18-reading-prove` plants each hollow
// reading against that judgement. Nothing of the copy may be left running afterwards.
//
// No network, no key, no cloud: prove's local world. What these journeys cannot say today waits on GOAL17-check-harness
// (`e2e/superagent/README.md`, "Slice 6").
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { removeCopies } from "./app.ts";
import { WANTED, problemsOf, proveCopy, stageOneCopy, type JourneyRun } from "./stage-one.ts";

let journeys: ReadonlyArray<JourneyRun> = [];

beforeAll(async () => {
  const root = stageOneCopy(WANTED.map((w) => w.file));
  journeys = (await proveCopy(root)).journeys;
}, 1_000_000);
afterAll(removeCopies);

describe("19 stage one's journeys", () => {
  for (const want of WANTED) {
    it(`journey "${want.name}": ${want.steps} steps, each green`, () => {
      expect(problemsOf(journeys, want)).toEqual([]);
    });
  }

  it("prove ran these six journeys and no other", () => {
    expect(journeys.map((j) => j.name).sort()).toEqual(WANTED.map((w) => w.name).sort());
  });
});
