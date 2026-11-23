// Checks-author file (Goal 17, slice 6). A builder never edits it. Written against GOAL17-check-harness's doors; see `22-stage-one-doors`.
// The executor reports `ready` (a handoff to a person: its Assignment ends at once), then a person stops the ticket: the Agent is still
// told to close the Assignment it last held ("Where it stands": a stop after a handoff closes the current Assignment on the Agent too).
import { Blueprint, expect, emits, outbox } from "orthograph";
import { models } from "@orthograph/stand-in-model/stand";
import { TicketStopped } from "@orthograph/tickets/blueprint/things/ticket/events.ts";
import stop from "@orthograph/tickets/blueprint/things/ticket/verbs/stop.ts";

export default Blueprint.journey("a stop after a handoff closes the agent's turn", {
  cast: { ada: Blueprint.signedIn },
  starts: "a-trigger-was-received",
  steps: (s) => [
    s.step("the main agent is scripted to accept ann's ask", models.script({ for: { kind: "main" }, turns: [
      { call: [{ tool: "decision.route", args: { items: [{ action: "accept", trigger: s.world.trigger, title: "fix the flaky login test" }] } }] }, { say: "Accepted." } ] })),
    s.step("the executor reports the work ready, which hands the ticket to a person", models.script({ for: { kind: "executor" }, turns: [
      { call: [{ tool: "ticket.report", args: { kind: "ready", text: "Fixed, ready for review." } }] }, { say: "Done." } ] })),
    s.step("the eval pass runs, the ticket is made and the executor runs", s.clock.advance("5 seconds")),
    s.step("the world settles", s.clock.settle()),
    s.step("the assignment ended on the report, before any stop", outbox.rows({ name: "AssignmentEnded", afterSeq: "journey" }), expect((a) => a.rows.length).toBe(1)),
    s.step("no agent close has been sent yet", outbox.rows({ to: "op:agent.close", afterSeq: "journey" }), expect((a) => a.rows.length).toBe(0)),
    s.step("the ticket's row says which ticket it is", outbox.rows({ name: "TicketCreated", afterSeq: "journey" }), expect((a) => a.rows.length).toBe(1)),
    s.step("ada stops the ticket", s.ada.run(stop, { superagent: s.world.superagent, ticket: s.last.rows[0].subject }), emits(TicketStopped, { superagent: s.world.superagent })),
    s.step("the world settles", s.clock.settle()),
    s.step("the Agent was told to close the assignment it last held", outbox.rows({ to: "op:agent.close", afterSeq: "journey" }), expect((a) => a.rows.length).toBe(1)),
  ],
});
