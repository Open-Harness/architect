// Slice 8: "a handed-off ticket does not get a seat back", and "ticket.stop after a handoff closes the executor's current Assignment on the
// Agent too". GOAL17-executor-slots, sections 3 and 5: a report that hands the work to a person ends the Assignment in the report's commit
// and frees the seat at once, while the Agent finishes its turn; a steer to that Assignment is still accepted, no seat is queued for it,
// and a stop then closes it on the Agent's side.
import { Blueprint, emits, expect } from "orthograph";
import { models, told, outbox } from "../kit/doors.ts";
import type { Told } from "../kit/doors.ts";
import { AssignmentEnded, AgentClosed, InputRouted, superagentResume, ticketReport, ticketStop, inputStore, itsAgent } from "../kit/ops.ts";
import { executorOf, turnSay } from "../kit/steps.ts";
import { SLACK_THREAD } from "../kit/consts.ts";

export default Blueprint.journey("a handed-off ticket does not get a seat back", {
  cast: { ann: Blueprint.signedIn, sys: Blueprint.system, executor: itsAgent },
  starts: "a-paused-ticket",
  steps: (s) => [
    s.step("the executor's turn stays open at the model", models.script({ for: executorOf("ticket/one"), turns: [turnSay("Opened it.", "before-reply")] })),
    s.step("ann resumes the superagent", s.ann.run(superagentResume, { superagent: s.world.superagent })),
    s.step("the executor is running", s.clock.settle()),
    s.step("the executor hands the work to a person, and the seat is free in the same commit", s.executor.run(ticketReport, { ticket: s.world.ticket, kind: "ready", text: "The pull request is ready." }),
      emits(AssignmentEnded, { seat: 1n })),
    s.step("a person writes while the Agent finishes its turn", s.sys.run(inputStore, { superagent: s.world.superagent, thread: SLACK_THREAD, from: "person", text: "thanks, one nit" })),
    s.step("the steer is accepted by the Agent that still holds the Assignment", s.clock.settle(), emits(InputRouted, { agent: s.world.executor })),
    s.step("the Agent was steered the nit", told({ agent: s.world.executor }),
      expect((a) => a.inputs.map((i: Told) => [i.text, i.how])).toEqual([["<@U0BOT0001> fix the flaky login test", "submitted"], ["thanks, one nit", "steered"]]),
      expect((a) => a.inputs[0].assignment !== null && a.inputs[1].assignment === a.inputs[0].assignment).toBe(true)),
    s.step("no seat was queued for the handed-off ticket: the one launch is the world's, before this journey", outbox.rows({ name: "AssignmentQueued", afterSeq: "journey" }), expect((a) => a.rows.length).toBe(0)),
    s.step("ann stops the ticket", s.ann.run(ticketStop, { superagent: s.world.superagent, ticket: s.world.ticket })),
    s.step("the stop closes the handed-off Assignment on the Agent's side too", s.clock.settle(), emits(AgentClosed, { agent: s.world.executor })),
    s.step("the seat was freed once, by the handoff, and the stop freed it no second time", outbox.rows({ name: "AssignmentEnded", to: "op:superagent.fill", afterSeq: "journey" }), expect((a) => a.rows.length).toBe(1)),
    s.step("the stop moved no ended Assignment back to closing", outbox.rows({ name: "AssignmentInterrupted", afterSeq: "journey" }), expect((a) => a.rows.length).toBe(0)),
  ],
});
