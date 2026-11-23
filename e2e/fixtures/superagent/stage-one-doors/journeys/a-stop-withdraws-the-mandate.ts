// Checks-author file (Goal 17, slice 6). A builder never edits it. Written against GOAL17-check-harness's doors; see `22-stage-one-doors`.
// A person's stop ends the ticket for good: its mandate is withdrawn, so a later message on its thread resumes nothing and goes to an eval
// (the prototype's `002`, "Resume and stop"); a stop picks `cancelled` for an Assignment still waiting for its seat and `interrupted` for one running,
// and closes the executor's turn on the Agent either way ("after a handoff" too: the Agent is told to close the Assignment it last held).
import { Blueprint, expect, emits, outbox } from "orthograph";
import { models } from "@orthograph/stand-in-model/stand";
import { TicketStopped } from "@orthograph/tickets/blueprint/things/ticket/events.ts";
import stop from "@orthograph/tickets/blueprint/things/ticket/verbs/stop.ts";
import stage from "@orthograph/tickets/blueprint/things/ticket/verbs/stage.ts";
import receive from "@orthograph/intake/blueprint/things/trigger/verbs/receive.ts";

export default Blueprint.journey("a stop withdraws the mandate", {
  cast: { ada: Blueprint.signedIn, source: Blueprint.system },
  starts: "a-trigger-was-received",
  steps: (s) => [
    s.step("the main agent is scripted to accept ann's ask", models.script({ for: { kind: "main" }, turns: [
      { call: [{ tool: "decision.route", args: { eval: "$eval", items: [{ action: "accept", trigger: s.world.trigger, title: "fix the flaky login test" }] } }] }, { say: "Accepted." } ] })),
    s.step("the executor's first turn is held open", models.script({ for: { kind: "executor" }, turns: [{ say: "On it.", hold: "before-reply" }] })),
    s.step("the eval pass runs and the ticket is made", s.clock.advance("5 seconds")),
    s.step("the world settles", s.clock.settle()),
    // a ticket's `TicketCreated` row is ordered by the ticket (GOAL17-check-harness, `OutboxRow.subject`): it says which ticket it is
    s.step("the ticket's row says which ticket it is", outbox.rows({ name: "TicketCreated", afterSeq: "journey" }), expect((a) => a.rows.length).toBe(1)),
    s.step("ada stops the ticket while its executor runs", s.ada.run(stop, { superagent: s.world.superagent, ticket: s.last.rows[0].subject }), emits(TicketStopped, { superagent: s.world.superagent })),
    s.step("the world settles", s.clock.settle()),
    s.step("the running assignment was interrupted, not cancelled", outbox.rows({ name: "AssignmentInterrupted", afterSeq: "journey" }), expect((a) => a.rows.length).toBe(1)),
    s.step("the Agent closed its turn", outbox.rows({ name: "AgentClosed", to: "op:assignment.turn-ended", afterSeq: "journey" }), expect((a) => a.rows.length).toBe(1)),
    s.step("the ticket's row, again", outbox.rows({ name: "TicketCreated", afterSeq: "journey" })),
    s.step("the ticket is ended", s.ada.run(stage, { id: s.last.rows[0].subject }), expect((a) => [a.stage, a.why, a.label]).toEqual(["ended", "none", "Ended"])),
    s.step("ann writes on its thread again, as a person", s.source.run(receive, {
      superagent: s.world.superagent, source: "slack", event: "Ev3", thread: "C1:1.1", kind: "mention", addressed: "mention", text: "@agent are you still there?",
      actor: { id: "U1", name: "ann", bot: false }, channel: { channel: "C1", ts: "1.1" } }), expect((a) => a.outcome).toBe("stored")),
    s.step("the main agent is scripted to ignore ann's new message, the trigger it was stored as", models.script({ for: { kind: "main" }, turns: [
      { call: [{ tool: "decision.route", args: { eval: "$eval", items: [{ action: "ignore", trigger: s.last.trigger }] } }] }, { say: "Ignored." } ] })),
    s.step("the world settles past the next eval pass", s.clock.advance("5 seconds")),
    s.step("the stopped ticket was not resumed", outbox.rows({ name: "TicketResumed", afterSeq: "journey" }), expect((a) => a.rows.length).toBe(0)),
    s.step("the message went to a new eval", outbox.rows({ name: "EvalStarted", afterSeq: "journey" }), expect((a) => a.rows.length).toBe(2)),
    s.step("every scripted turn was used", models.done({}), expect((a) => a.unused).toBe(0)),
  ],
});
