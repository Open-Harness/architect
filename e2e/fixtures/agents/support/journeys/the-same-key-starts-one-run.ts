// Journey-author file (M4.02). The builder never edits it. K10 section 5: `run.start` takes `key`, the caller's request key.
//
// In words:
//   Ada starts a notes run with the key `claim-7`. The same start again, with the same key and the same words, answers
//   the same run and starts nothing: no event, and one run in her list. A different key is a different run: she then
//   has two, and Bob, who started none, has none. So a replayed dispatch starts nothing twice, and the key alone does not
//   collapse every start into one. A run is started by a person: an agent key for Ada is refused `NotAllowed`.
import { Blueprint, Via, emits, expect, noEvents, refuses } from "orthograph";
import { Models } from "@orthograph/agents";
import start from "@orthograph/agents/blueprint/things/run/verbs/start.js";
import list from "@orthograph/agents/blueprint/things/run/verbs/list.js";
import { RunStarted } from "@orthograph/agents/blueprint/things/run/events.js";
import notes from "../blueprint/agents/notes.ts";

const first = { agent: notes, model: Models.standIn, brief: "say hello", budget: 100n, key: "claim-7" } as const;

export default Blueprint.journey("the same key starts one run", {
  cast: { ada: Blueprint.signedIn, bob: Blueprint.signedIn },
  starts: "bob-funded",
  steps: (s) => [
    s.step("the stand-in model is held", s.world.holdModel(), expect((a) => a.held).toBe(true)),
    s.step(
      "ada starts a run with the key claim-7",
      s.ada.run(start, first),
      emits(RunStarted, { run: s.started.run }),
    ),
    s.step(
      "the same start again answers the same run and starts nothing",
      s.ada.run(start, first),
      expect((a) => typeof a.run).toBe("string"),
      noEvents(),
    ),
    s.step(
      "she has one run, and it is the one the replay answered",
      s.ada.run(list, { startedBy: s.ada.person }),
      expect((a) => a.items.map((i: { readonly id: unknown }) => i.id)).toEqual([s.started.run]),
    ),
    s.step(
      "another key is another run",
      s.ada.run(start, { ...first, key: "claim-8" }),
      emits(RunStarted, { run: s.started.run }),
    ),
    s.step(
      "she has two runs",
      s.ada.run(list, { startedBy: s.ada.person }),
      expect((a) => a.items.length).toBe(2),
    ),
    s.step(
      "bob has none of them",
      s.bob.run(list, { startedBy: s.bob.person }),
      expect((a) => a.items.length).toBe(0),
    ),
    s.step(
      "an agent key for ada can't start a run",
      s.ada.via(Via.agent).run(start, { ...first, key: "claim-9" }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
    ),
  ],
});
