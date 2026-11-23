// Check 22 (slice 6): the stage-one journeys that need GOAL17-check-harness's doors, run by `ortho prove` as 19's are. Each is written against the
// surface the record fixes (`GOAL17-check-harness.md`, calls 0 to 3): the stand-in model's script (`models.script`, `held`, `release`, `done`, `seen`),
// the world's clock (`s.clock.advance`, `settle`), the outbox (`outbox.rows`, `hold`, `release`), and the `actor:` cast form for a listed account.
//   - observe records "would accept" for an inferred candidate and starts nothing
//   - a follow-up reaches its ticket with no eval
//   - a policy change restarts a live eval
//   - a stop withdraws the mandate (and a later message goes to an eval)
//   - a stop cancels a waiting assignment and interrupts a running one, from the state it reads
//   - a stop after a handoff still closes the Agent's turn
//   - the stage read has every row, through the served read
//   - an accept makes five records in one commit (a listed account is the caller)
// None of those doors is built (slice 8 builds the surface, slice 9 the instruments: the record's call 6), so prove cannot load these journeys and the run
// stops before its first step; every test below is red on that, which is the one line each waits on:
//   the surface (`outbox`, `models`, `s.clock.settle`, the `actor:` cast form), then slice 9's stand-in model, `agent.open`, the drain on `Timers`.
// The accept journey needs only the `actor:` cast form, so it runs in a prove run of its own: one journey that fails to load cannot hide the others, and the
// other seven (all of which need the model's script and the outbox) share one run. When the doors are built these run unchanged. Each journey's expectation
// is only what the records say (the prototype's `002`, the brief, GOAL17-stage-one); the shapes the records did not give are GOAL17-stage-one call 11.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { removeCopies } from "./app.ts";
import { DOORS, problemsOf, proveCopy, stageOneCopy, type JourneyRun, type Wanted } from "./stage-one.ts";

const ALONE = "an-accept-makes-five-records-in-one-commit.ts";
const groups: ReadonlyArray<{ readonly title: string; readonly wanted: ReadonlyArray<Wanted> }> = [
  { title: "an accept, needing only the actor cast form", wanted: DOORS.filter((w) => w.file === ALONE) },
  { title: "the model's script and the outbox", wanted: DOORS.filter((w) => w.file !== ALONE) },
];

for (const group of groups) {
  describe(`22 stage one's journeys through the harness's doors: ${group.title}`, () => {
    let journeys: ReadonlyArray<JourneyRun> = [];
    let couldNotRun: string | undefined;
    beforeAll(async () => {
      try {
        const root = stageOneCopy(group.wanted.map((w) => w.file), group.wanted[0]!.dir!);
        journeys = (await proveCopy(root)).journeys;
      } catch (e) {
        couldNotRun = String((e as Error).message).split("\n").slice(0, 12).join("\n");
      }
    }, 1_000_000);
    afterAll(removeCopies);

    for (const want of group.wanted) {
      it(`journey "${want.name}": ${want.steps} steps, each green`, () => {
        expect(couldNotRun, `prove could not run the journeys that use the harness's doors:\n${couldNotRun}`).toBeUndefined();
        expect(problemsOf(journeys, want)).toEqual([]);
      });
    }
  });
}
