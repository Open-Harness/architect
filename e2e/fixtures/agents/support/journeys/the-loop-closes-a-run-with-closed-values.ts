// Journey-author file (M4.02). The builder never edits it. K10 section 5: `outcome` and `reason` are closed.
//
// In words:
//   Only a run's own loop, the system, may finish or fail it: Ada, who started the run, is refused both as
//   `NotAllowed`. The loop finishes a run with an outcome from the closed four (`pushed`, `reviewed`, `answered`,
//   `blocked`) and fails one with a reason from the closed seven (`budget`, `turns`, `wall`, `refused`, `model`,
//   `sandbox`, `crash`). A word outside them is refused as an invalid payload and the run is left working. A failure
//   says whether it is worth retrying: `model`, `sandbox` and `crash` are transient, the other four are not.
//
// Each of the 4 outcomes and 7 reasons is closed by the loop on its own run, so a run that accepted only some of its
// closed values, or one more than them, fails a step here. The system's calls need no model: the stand-in is held.
import { Blueprint, emits, expect, noEvents, refuses } from "orthograph";
import { Models } from "@orthograph/agents";
import start from "@orthograph/agents/blueprint/things/run/verbs/start.js";
import finish from "@orthograph/agents/blueprint/things/run/verbs/finish.js";
import fail from "@orthograph/agents/blueprint/things/run/verbs/fail.js";
import { machine } from "@orthograph/agents/blueprint/things/run/machine.js";
import { RunFailed, RunFinished } from "@orthograph/agents/blueprint/things/run/events.js";
import notes from "../blueprint/agents/notes.ts";

const OUTCOMES = ["pushed", "reviewed", "answered", "blocked"] as const;
const REASONS = [["budget", false], ["turns", false], ["wall", false], ["refused", false], ["model", true], ["sandbox", true], ["crash", true]] as const;

export default Blueprint.journey("the loop closes a run with closed values", {
  cast: { ada: Blueprint.signedIn, loop: Blueprint.system },
  starts: "bob-funded",
  steps: (s) => {
    // A fresh run each time: the pool holds two, so each is closed before the next starts.
    const begin = (key: string) =>
      s.step(`a run is started with the key ${key}`, s.ada.run(start, { agent: notes, model: Models.standIn, brief: "say hello", budget: 100n, key }), machine.isIn(s.started.run, "working"));
    return [
    s.step("the stand-in model is held", s.world.holdModel(), expect((a) => a.held).toBe(true)),
    begin("close-0"),
    s.step("ada can't finish her own run", s.ada.run(finish, { run: s.started.run, outcome: "answered", spent: 0n }), refuses(Blueprint.NotAllowed), noEvents(), machine.isIn(s.started.run, "working")),
    s.step("ada can't fail her own run", s.ada.run(fail, { run: s.started.run, reason: "crash" }), refuses(Blueprint.NotAllowed), noEvents(), machine.isIn(s.started.run, "working")),
    s.step("the loop can't finish it with a word outside the four", s.loop.run(finish, { run: s.started.run, outcome: "won" as never, spent: 0n }), refuses(Blueprint.InvalidPayload, { field: "outcome" }), noEvents(), machine.isIn(s.started.run, "working")),
    s.step("the loop can't finish it with a word of the four in another case", s.loop.run(finish, { run: s.started.run, outcome: "Answered" as never, spent: 0n }), refuses(Blueprint.InvalidPayload, { field: "outcome" }), noEvents(), machine.isIn(s.started.run, "working")),
    s.step("the loop can't fail it with a word outside the seven", s.loop.run(fail, { run: s.started.run, reason: "boredom" as never }), refuses(Blueprint.InvalidPayload, { field: "reason" }), noEvents(), machine.isIn(s.started.run, "working")),
    s.step("the loop can't fail it with a plausible word that is not one of the seven", s.loop.run(fail, { run: s.started.run, reason: "timeout" as never }), refuses(Blueprint.InvalidPayload, { field: "reason" }), noEvents(), machine.isIn(s.started.run, "working")),
    ...OUTCOMES.flatMap((outcome, i) => [
      ...(i === 0 ? [] : [begin(`close-${outcome}`)]),
      s.step(`the loop finishes a run as ${outcome}`, s.loop.run(finish, { run: s.started.run, outcome, spent: 0n }), emits(RunFinished, { run: s.started.run, outcome, spent: 0n }), machine.isIn(s.started.run, "done")),
    ]),
    ...REASONS.flatMap(([reason, transient]) => [
      begin(`fail-${reason}`),
      s.step(`the loop fails a run for ${reason}, and it is ${transient ? "" : "not "}transient`, s.loop.run(fail, { run: s.started.run, reason }), emits(RunFailed, { run: s.started.run, reason, transient }), machine.isIn(s.started.run, "failed")),
    ]),
    ];
  },
});
