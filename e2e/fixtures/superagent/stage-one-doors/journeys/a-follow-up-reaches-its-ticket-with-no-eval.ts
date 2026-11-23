// Checks-author file (Goal 17, slice 6). A builder never edits it. Written against GOAL17-check-harness's doors; see `22-stage-one-doors`.
// A trigger on a thread a ticket follows goes straight to that ticket's executor as an Input: the eval pass starts no second eval.
import { Blueprint, expect, emits, outbox } from "orthograph";
import { models } from "@orthograph/stand-in-model/stand";
import { TicketCreated } from "@orthograph/tickets/blueprint/things/ticket/events.ts";
import receive from "@orthograph/intake/blueprint/things/trigger/verbs/receive.ts";

export default Blueprint.journey("a follow-up reaches its ticket with no eval", {
  cast: { source: Blueprint.system },
  starts: "a-trigger-was-received",
  steps: (s) => [
    s.step("the main agent is scripted to accept ann's ask", models.script({ for: { kind: "main" }, turns: [
      { call: [{ tool: "decision.route", args: { items: [{ action: "accept", trigger: s.world.trigger, title: "fix the flaky login test" }] } }] }, { say: "Accepted." } ] })),
    s.step("the executor is scripted to answer each message once", models.script({ for: { kind: "executor" }, turns: [{ say: "On it." }, { say: "Added the case." }] })),
    s.step("the eval pass runs: one ticket is made", s.clock.advance("5 seconds"), emits(TicketCreated, { superagent: s.world.superagent })),
    s.step("the world settles", s.clock.settle()),
    s.step("one eval has run", outbox.rows({ name: "EvalStarted", afterSeq: "journey" }), expect((a) => a.rows.length).toBe(1)),
    s.step("ann writes on the thread the ticket follows", s.source.run(receive, {
      superagent: s.world.superagent, source: "slack", event: "Ev2", thread: "C1:1.1", kind: "message", text: "also cover the second-factor case",
      actor: { id: "U1", name: "ann", bot: false }, channel: { channel: "C1", ts: "1.1" } }), expect((a) => a.outcome).toBe("stored")),
    s.step("the world settles past the next eval pass", s.clock.advance("5 seconds")),
    s.step("still one eval: the follow-up went to the executor", outbox.rows({ name: "EvalStarted", afterSeq: "journey" }), expect((a) => a.rows.length).toBe(1)),
    s.step("the executor was told it, once", models.seen({ containing: "second-factor case" }), expect((a) => a.requests.length).toBe(1)),
  ],
});
