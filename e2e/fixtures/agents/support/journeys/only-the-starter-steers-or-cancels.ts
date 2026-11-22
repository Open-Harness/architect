// Journey-author file (M4.02). The builder never edits it.
//
// In words (frame journey 6):
//   Bob is signed in but he is not Ada. Ada starts a run. Bob can't steer it and can't cancel it: each is refused
//   as `NotAllowed`, nothing is emitted, the transcript has no note of his and the run is still working. Ada
//   can cancel it herself, so the refusal was about Bob and not about the run.
import { Blueprint, emits, expect, noEvents, refuses } from "orthograph";
import { Models } from "@orthograph/agents";
import start from "@orthograph/agents/blueprint/things/run/verbs/start.js";
import steer from "@orthograph/agents/blueprint/things/run/verbs/steer.js";
import cancel from "@orthograph/agents/blueprint/things/run/verbs/cancel.js";
import { machine } from "@orthograph/agents/blueprint/things/run/machine.js";
import { RunCancelled } from "@orthograph/agents/blueprint/things/run/events.js";
import notes from "../blueprint/agents/notes.ts";

export default Blueprint.journey("only the starter steers or cancels", {
  cast: { ada: Blueprint.signedIn, bob: Blueprint.signedIn },
  starts: "bob-funded",
  steps: (s) => [
    s.step("the stand-in model is held", s.world.holdModel(), expect((a) => a.held).toBe(true)),
    s.step(
      "ada starts a notes run",
      s.ada.run(start, { agent: notes, model: Models.standIn, brief: "say hello", budget: 100n, key: "own-1" }),
      machine.isIn(s.started.run, "working"),
    ),
    s.step(
      "bob can't steer it",
      s.bob.run(steer, { run: s.started.run, note: "do it my way" }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      machine.isIn(s.started.run, "working"),
    ),
    s.step(
      "the transcript has no note of his",
      s.world.transcript({ run: s.started.run }),
      expect((a) => a.steering).toEqual([]),
    ),
    s.step(
      "bob can't cancel it",
      s.bob.run(cancel, { run: s.started.run }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      machine.isIn(s.started.run, "working"),
    ),
    s.step(
      "ada can: cancelled",
      s.ada.run(cancel, { run: s.started.run }),
      emits(RunCancelled, { run: s.started.run }),
      machine.isIn(s.started.run, "cancelled"),
    ),
  ],
});
