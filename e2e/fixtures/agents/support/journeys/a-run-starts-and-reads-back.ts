// Journey-author file (M4.02). The builder never edits it (AGENTS.md, "Journeys and checks come first").
//
// In words (frame journey 1):
//   Ada starts the notes agent on a brief with a budget of 100 cents. The run is working. She reads it back and sees
//   the agent, the model, her brief and nothing spent. The model answers, the run finishes as `answered`, and
//   reading it back again shows it done with one reply paid for: the stand-in prices a reply at 2 cents. A finished
//   run can no longer be cancelled.
//
// The stand-in is held until the run has been read, so "working" and "nothing spent" are facts, not a race.
// Doors beyond M4-agents (e2e/agents/feature/README.md): `s.world.holdModel`, `releaseModel`, `until`.
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { Models } from "@orthograph/agents";
import start from "@orthograph/agents/blueprint/things/run/verbs/start.js";
import get from "@orthograph/agents/blueprint/things/run/verbs/get.js";
import cancel from "@orthograph/agents/blueprint/things/run/verbs/cancel.js";
import { machine } from "@orthograph/agents/blueprint/things/run/machine.js";
import { RunFinished, RunStarted } from "@orthograph/agents/blueprint/things/run/events.js";
import notes from "../blueprint/agents/notes.ts";

export default Blueprint.journey("a run starts and reads back", {
  cast: { ada: Blueprint.signedIn },
  starts: "bob-funded",
  steps: (s) => [
    s.step(
      "the stand-in model is held",
      s.world.holdModel(),
      expect((a) => a.held).toBe(true),
    ),
    s.step(
      "ada starts a notes run with a budget of 100",
      s.ada.run(start, { agent: notes, model: Models.standIn, brief: "say hello", budget: 100n, key: "hello-1" }),
      emits(RunStarted, { run: s.started.run, agent: notes, model: Models.standIn, starter: s.ada.person }),
      machine.isIn(s.started.run, "working"),
      spans({ present: ["run.start"] }),
    ),
    s.step(
      "read back, it is working with nothing spent",
      s.ada.run(get, { id: s.started.run }),
      expect((a) => [a.agent, a.model, a.brief, a.budget, a.spent, a.state]).toEqual(["notes", Models.standIn, "say hello", 100n, 0n, "working"]),
    ),
    s.step(
      "the model answers",
      s.world.releaseModel({ run: s.started.run }),
      expect((a) => a.held).toBe(false),
    ),
    s.step(
      "the run finishes as answered",
      s.world.until(machine.isIn(s.started.run, "done")),
      emits(RunFinished, { run: s.started.run, outcome: "answered", spent: 2n }),
    ),
    s.step(
      "read back, it is done with one reply paid for",
      s.ada.run(get, { id: s.started.run }),
      expect((a) => [a.spent, a.state]).toEqual([2n, "done"]),
    ),
    s.step(
      "a finished run can't be cancelled",
      s.ada.run(cancel, { run: s.started.run }),
      refuses(machine.notFrom, { state: "done" }),
      noEvents(),
    ),
  ],
});
