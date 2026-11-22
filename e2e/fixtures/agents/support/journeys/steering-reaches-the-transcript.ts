// Journey-author file (M4.02). The builder never edits it.
//
// In words (frame journey 2):
//   Ada starts a notes run and, while it works, steers it with a note. The run is still working, it says it was
//   steered, and the transcript holds her note, once, and nothing else of hers. A second note after the first is
//   kept in order after it. The journey never reads what the model said.
import { Blueprint, emits, expect } from "orthograph";
import { Models } from "@orthograph/agents";
import start from "@orthograph/agents/blueprint/things/run/verbs/start.js";
import get from "@orthograph/agents/blueprint/things/run/verbs/get.js";
import steer from "@orthograph/agents/blueprint/things/run/verbs/steer.js";
import { machine } from "@orthograph/agents/blueprint/things/run/machine.js";
import { RunSteered } from "@orthograph/agents/blueprint/things/run/events.js";
import notes from "../blueprint/agents/notes.ts";

export default Blueprint.journey("steering reaches the transcript", {
  cast: { ada: Blueprint.signedIn },
  starts: "bob-funded",
  steps: (s) => [
    s.step("the stand-in model is held", s.world.holdModel(), expect((a) => a.held).toBe(true)),
    s.step(
      "ada starts a notes run",
      s.ada.run(start, { agent: notes, model: Models.standIn, brief: "list the files", budget: 100n, key: "steer-1" }),
      machine.isIn(s.started.run, "working"),
    ),
    s.step(
      "ada steers it and it is still working",
      s.ada.run(steer, { run: s.started.run, note: "use the remaining field" }),
      emits(RunSteered, { run: s.started.run, note: "use the remaining field" }),
      machine.isIn(s.started.run, "working"),
    ),
    s.step(
      "the transcript has her note",
      s.world.transcript({ run: s.started.run }),
      expect((a) => a.steering).toEqual(["use the remaining field"]),
    ),
    s.step(
      "a second note is kept after the first",
      s.ada.run(steer, { run: s.started.run, note: "and keep it short" }),
      emits(RunSteered, { run: s.started.run, note: "and keep it short" }),
    ),
    s.step(
      "the transcript has both notes in order",
      s.world.transcript({ run: s.started.run }),
      expect((a) => a.steering).toEqual(["use the remaining field", "and keep it short"]),
    ),
    s.step(
      "read back, the brief is hers and the run is working",
      s.ada.run(get, { id: s.started.run }),
      expect((a) => [a.agent, a.brief, a.state]).toEqual(["notes", "list the files", "working"]),
    ),
  ],
});
