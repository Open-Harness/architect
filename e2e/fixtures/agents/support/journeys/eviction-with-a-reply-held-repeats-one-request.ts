// Journey-author file (M4.02). The builder never edits it.
//
// In words (frame journey 5, second half; M4-agents call 3, the honest limit):
//   Ada starts a notes run and the stand-in holds its reply: one request is in flight and nothing has committed.
//   The world evicts the run's host. The cut request can't be resumed, so on resume it is sent again, exactly once more
//   (two requests in all, the first one twice) and not a third time. Nothing was committed before, so the run is
//   paid for one reply only: 2 cents, never 4.
import { Blueprint, emits, expect } from "orthograph";
import { Models } from "@orthograph/agents";
import start from "@orthograph/agents/blueprint/things/run/verbs/start.js";
import { machine } from "@orthograph/agents/blueprint/things/run/machine.js";
import { RunFinished } from "@orthograph/agents/blueprint/things/run/events.js";
import notes from "../blueprint/agents/notes.ts";

export default Blueprint.journey("eviction with a reply held repeats one request", {
  cast: { ada: Blueprint.signedIn },
  starts: "bob-funded",
  steps: (s) => [
    s.step("the stand-in model is held", s.world.holdModel(), expect((a) => a.held).toBe(true)),
    s.step(
      "ada starts a notes run",
      s.ada.run(start, { agent: notes, model: Models.standIn, brief: "say hello", budget: 100n, key: "held-1" }),
      machine.isIn(s.started.run, "working"),
    ),
    s.step(
      "the world evicts the run's host while its request is in flight",
      s.world.evict({ run: s.started.run, during: "model" }),
      expect((a) => [a.during, a.turnsCommitted]).toEqual(["model", 0]),
    ),
    s.step(
      "the stand-in is released and the run resumes",
      s.world.releaseModel({ run: s.started.run }),
      expect((a) => a.held).toBe(false),
    ),
    s.step(
      "it finishes under the same id",
      s.world.until(machine.isIn(s.started.run, "done")),
      emits(RunFinished, { run: s.started.run, outcome: "answered", spent: 2n }),
    ),
    s.step(
      "the stand-in saw two requests: the first twice, and no more",
      s.world.requests({ run: s.started.run }),
      expect((a) => [a.sent, a.repeated]).toEqual([2, [1]]),
    ),
    s.step(
      "one reply is paid for: 2 cents",
      s.world.usage({ run: s.started.run }),
      expect((a) => [a.turns, a.spent]).toEqual([1, 2n]),
    ),
    s.step(
      "the run lived in two hosts: the one evicted and the one that resumed it",
      s.world.hosts({ run: s.started.run }),
      expect((a) => a.started).toBe(2),
    ),
  ],
});
