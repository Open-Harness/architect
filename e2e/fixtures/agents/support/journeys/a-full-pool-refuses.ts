// Journey-author file (M4.02). The builder never edits it. K10 section 5: a full pool is the typed refusal `RunPoolFull`.
//
// In words:
//   acme's pool holds two runs at once (the mount, blueprint/features/agents.ts). Ada starts a first and a second
//   run, both working. A third is refused as `RunPoolFull`: nothing is emitted and no run is made, so she still has two
//   working. A refusal that is a signal, not a failure. She cancels the second, a slot is free, and the same third
//   start now works. A fourth is refused again: the pool is full again, not open for good.
import { Blueprint, emits, expect, noEvents, refuses } from "orthograph";
import { Models } from "@orthograph/agents";
import start from "@orthograph/agents/blueprint/things/run/verbs/start.js";
import cancel from "@orthograph/agents/blueprint/things/run/verbs/cancel.js";
import list from "@orthograph/agents/blueprint/things/run/verbs/list.js";
import { RunPoolFull } from "@orthograph/agents/blueprint/things/run/errors.js";
import { RunStarted } from "@orthograph/agents/blueprint/things/run/events.js";
import notes from "../blueprint/agents/notes.ts";

const run = (key: string) => ({ agent: notes, model: Models.standIn, brief: "say hello", budget: 100n, key });

export default Blueprint.journey("a full pool refuses", {
  cast: { ada: Blueprint.signedIn },
  starts: "bob-funded",
  steps: (s) => [
    s.step("the stand-in model is held", s.world.holdModel(), expect((a) => a.held).toBe(true)),
    s.step("ada starts a first run", s.ada.run(start, run("pool-1")), emits(RunStarted, { run: s.started.run })),
    s.step("ada starts a second run", s.ada.run(start, run("pool-2")), emits(RunStarted, { run: s.started.run })),
    s.step("a third is refused: the pool is full", s.ada.run(start, run("pool-3")), refuses(RunPoolFull), noEvents()),
    s.step(
      "she still has two runs working and no third",
      s.ada.run(list, { startedBy: s.ada.person }),
      expect((a) => a.items.map((i: { readonly state: string }) => i.state)).toEqual(["working", "working"]),
    ),
    s.step("she cancels the second", s.ada.run(cancel, { run: s.started.run })),
    s.step("a third start, with a new key, now works", s.ada.run(start, run("pool-5")), emits(RunStarted, { run: s.started.run })),
    s.step("a fourth is refused: it is full again", s.ada.run(start, run("pool-4")), refuses(RunPoolFull), noEvents()),
  ],
});
