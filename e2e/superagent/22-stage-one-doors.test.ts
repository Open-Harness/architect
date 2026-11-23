// Check 22 (slice 6): the stage-one journeys that need GOAL17-check-harness's doors, run by `ortho prove` as 19's are. Each is written against the
// surface the record fixes (`GOAL17-check-harness.md`, calls 0 to 3): the stand-in model's script (`models.script`, `held`, `release`, `done`, `seen`),
// the world's clock (`s.clock.advance`, `settle`), the outbox (`outbox.rows`, `hold`, `release`), and the `actor:` cast form for a listed account.
//   - observe records "would accept" and starts nothing
//   - a follow-up reaches its ticket with no eval
//   - a policy change restarts a live eval
//   - a stop withdraws the mandate (and a later message goes to an eval)
//   - a stop cancels a waiting assignment and interrupts a running one, from the state it reads
//   - a stop after a handoff still tells the Agent to close
//   - the stage read has every row, through the served read
//   - an accept makes five records in one commit (a listed account is the caller)
// None of those doors is built (slice 8 builds the surface, slice 9 the instruments: the record's call 6), so prove cannot load these journeys and the run
// stops before its first step; every test below is red on that, which is the one line each waits on:
//   the surface (`outbox`, `models`, `s.clock.settle`, the `actor:` cast form), then slice 9's stand-in model, `agent.open`, the drain on `Timers`.
// When they are built these run unchanged. Each journey's expectation is only what the records say (the prototype's `002`, the brief, GOAL17-stage-one);
// where a record did not give a shape (`decision.route`'s items, which ticket an outbox row names) the journey says so in its own comments.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { removeCopies } from "./app.ts";
import { DOORS, problemsOf, proveCopy, stageOneCopy, type JourneyRun } from "./stage-one.ts";

let journeys: ReadonlyArray<JourneyRun> = [];
let couldNotRun: string | undefined;

beforeAll(async () => {
  try {
    const root = stageOneCopy(DOORS.map((w) => w.file), DOORS[0]!.dir!);
    journeys = (await proveCopy(root)).journeys;
  } catch (e) {
    couldNotRun = String((e as Error).message).split("\n").slice(0, 12).join("\n");
  }
}, 1_000_000);
afterAll(removeCopies);

describe("22 stage one's journeys through the harness's doors", () => {
  for (const want of DOORS) {
    it(`journey "${want.name}": ${want.steps} steps, each green`, () => {
      expect(couldNotRun, `prove could not run the journeys that use the harness's doors:\n${couldNotRun}`).toBeUndefined();
      expect(problemsOf(journeys, want)).toEqual([]);
    });
  }
});
