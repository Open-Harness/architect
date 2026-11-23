// Checks-author file (Goal 17, slice 6). A builder never edits it. Written against GOAL17-check-harness's doors; see `22-stage-one-doors`.
// `ticket.stop` picks `cancelled` for an Assignment still waiting for its seat and `interrupted` for one that runs (the brief, "Where it stands";
// GOAL17-names call 4), and a stop after a handoff, when the Assignment has already ended on the executor's own report, still tells the Agent to close.
import { Blueprint, expect, emits, outbox } from "orthograph";
import { models } from "@orthograph/stand-in-model/stand";
import { TicketStopped } from "@orthograph/tickets/blueprint/things/ticket/events.ts";
import stop from "@orthograph/tickets/blueprint/things/ticket/verbs/stop.ts";

export default Blueprint.journey("a stop cancels or closes from the state it reads", {
  cast: { ada: Blueprint.signedIn },
  starts: "a-trigger-was-received",
  steps: (s) => [
    s.step("the main agent is scripted to accept ann's ask", models.script({ for: { kind: "main" }, turns: [
      { call: [{ tool: "decision.route", args: { eval: "$eval", items: [{ action: "accept", trigger: s.world.trigger, title: "fix the flaky login test" }] } }] }, { say: "Accepted." } ] })),
    s.step("the seat sweep is held, so the first assignment waits", outbox.hold({ name: "AssignmentQueued", to: "op:superagent.fill" })),
    s.step("the eval pass runs and the ticket is made", s.clock.advance("5 seconds")),
    s.step("the world settles", s.clock.settle()),
    s.step("the ticket's row says which ticket it is", outbox.rows({ name: "TicketCreated", afterSeq: "journey" }), expect((a) => a.rows.length).toBe(1)),
    s.step("ada stops it while its assignment waits", s.ada.run(stop, { superagent: s.world.superagent, ticket: s.last.rows[0].subject }), emits(TicketStopped, { superagent: s.world.superagent })),
    s.step("the world settles", s.clock.settle()),
    s.step("the waiting assignment was cancelled", outbox.rows({ name: "AssignmentEnded", to: "op:superagent.fill", afterSeq: "journey" }), expect((a) => a.rows.length).toBe(1)),
    s.step("nothing was interrupted: it never ran", outbox.rows({ name: "AssignmentInterrupted", afterSeq: "journey" }), expect((a) => a.rows.length).toBe(0)),
  ],
});
