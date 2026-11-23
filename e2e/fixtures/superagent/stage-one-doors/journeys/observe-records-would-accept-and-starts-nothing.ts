// Checks-author file (Goal 17, slice 6). A builder never edits it. Written against GOAL17-check-harness's doors (the stand-in model's script,
// `s.clock.advance` and `settle`, `outbox.rows`), which are not built yet; `22-stage-one-doors` says what each waits on.
// In `observe`, an inferred candidate the main agent would accept is recorded, and nothing starts: no ticket, no reply, nothing waiting.
import { Blueprint, expect, emits, outbox } from "orthograph";
import { models } from "@orthograph/stand-in-model/stand";
import { DecisionRecorded } from "@orthograph/intake/blueprint/things/decision/events.ts";
import waiting from "@orthograph/tickets/blueprint/things/ticket/verbs/waiting.ts";

export default Blueprint.journey("observe records would accept and starts nothing", {
  cast: { ada: Blueprint.signedIn },
  starts: "an-inferred-candidate-waits",
  steps: (s) => [
    s.step("the main agent is scripted to accept the candidate", models.script({ for: { kind: "main" }, turns: [
      { call: [{ tool: "decision.route", args: { eval: "$eval", items: [{ action: "accept", trigger: s.world.trigger, title: "fix the build on main" }] } }] },
      { say: "Recorded." },
    ] })),
    s.step("the eval pass runs and the main agent decides", s.clock.advance("5 seconds"), emits(DecisionRecorded, { superagent: s.world.superagent })),
    s.step("the world settles", s.clock.settle()),
    s.step("no ticket was made", outbox.rows({ name: "TicketCreated", afterSeq: "journey" }), expect((a) => a.rows.length).toBe(0)),
    s.step("nothing waits for a person", s.ada.run(waiting, { superagent: s.world.superagent }), expect((a) => a.items).toEqual([])),
    s.step("every scripted turn was used: the main agent did decide", models.done({}), expect((a) => a.unused).toBe(0)),
  ],
});
