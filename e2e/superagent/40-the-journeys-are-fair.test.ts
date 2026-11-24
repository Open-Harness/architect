// Slice 8's author proves each journey fair, and keeps the proof as a check (the `author` skill, proofs 2 and 5): against a tape, what a correct
// system would have answered at each step, written by hand from the records, the journey can pass; and against every way of making the tape
// wrong, it fails at exactly the step that reads what was made wrong. Nothing here runs the app: this file is green today and stays green,
// so a journey edited into a hollow one goes red here before any builder sees it. The journeys themselves run for real in 41 to 47.
import { afterAll, describe, expect, it } from "vitest";
import { allJourneys, tapeCopy, tapeRun } from "./agents-support.ts";
import { removeCopies, lazy } from "./app.ts";
import { JOURNEYS } from "./journeys-table.ts";

afterAll(removeCopies);
const copy = lazy(tapeCopy);

describe("every slice 8 journey is fair", () => {
  it("the table that 41 to 47 run the journeys by lists each journey file, once", () => expect(JOURNEYS.map((j) => j.file)).toEqual([...allJourneys()]));
  for (const name of allJourneys()) {
    describe(name, () => {
      const result = lazy(() => tapeRun(copy(), name));
      it("is the journey it is named for, and its tape names only its own steps", () => {
        const r = result();
        const row = JOURNEYS.find((j) => j.file === name);
        expect([r.journey, r.titles.length], "journeys-table.ts names this journey and its step count, which 41 to 47 run it by").toEqual([row?.name, row?.steps]);
        expect(r.unknownTapeSteps, "tape data for a step the journey does not have").toEqual([]);
        expect(r.unknownPlantSteps, "a planted tape aimed at a step the journey does not have").toEqual([]);
        expect(r.titles.length, "a journey with no steps").toBeGreaterThan(0);
        expect(new Set(r.titles).size, "two steps with one title: a tape could not tell them apart").toBe(r.titles.length);
      });
      it("can pass: a correct system's tape passes every step", () => expect(result().good).toEqual([]));
      it("fails at exactly the step each planted wrong tape is wrong at", () => {
        const r = result();
        expect(r.plants.length, "a journey with no planted tape").toBeGreaterThan(0);
        for (const p of r.plants) expect(p.failedAt, `planted "${p.name}"`).toEqual([p.step]);
      });
      it("is not hollow: it catches every change to an answer part it reads, and every event left out or made wrong", () => {
        const r = result();
        expect(r.mutantRuns.filter((m) => m.read && !m.failed).map((m) => `${m.step}: ${m.path} ${m.kind}`)).toEqual([]);
        expect(r.eventRuns.filter((e) => !e.failed).map((e) => `${e.step}: ${e.what}`)).toEqual([]);
        expect(r.extraRuns.filter((e) => !e.atStep && e.followers.length === 0).map((e) => `${e.step}: an event added, and no later step catches it`)).toEqual([]);
      });
    });
  }
});
