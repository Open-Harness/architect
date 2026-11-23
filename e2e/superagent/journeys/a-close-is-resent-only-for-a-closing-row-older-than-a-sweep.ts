// Slice 8: "a close is resent only for a closing row older than a sweep". GOAL17-executor-slots, "A close that never lands": `reap` lists `closing`
// rows too and sends `agent.close` again, but only for one that has stayed closing for more than a sweep. The stop's own close is parked, so
// the only way the Agent hears it is `reap`'s resend.
import { Blueprint, emits, noEvents, expect } from "orthograph";
import { models, outbox } from "../kit/doors.ts";
import { AssignmentInterrupted, AssignmentEnded, AgentClosed, superagentResume, ticketStop } from "../kit/ops.ts";
import { executorOf, turnSay } from "../kit/steps.ts";

export default Blueprint.journey("a close is resent only for a closing row older than a sweep", {
  cast: { ann: Blueprint.signedIn },
  starts: "a-paused-ticket",
  steps: (s) => [
    s.step("the executor answers at once, and its idle is parked, so the Assignment stays running with no model held", models.script({ for: executorOf("ticket/one"), turns: [turnSay("Working.")] })),
    s.step("the stop's close never lands", outbox.hold({ name: "AssignmentInterrupted", to: "op:agent.close" })),
    s.step("the Agent's idle never lands either", outbox.hold({ name: "AgentIdled", to: "op:assignment.turnEnded" })),
    s.step("ann resumes the superagent", s.ann.run(superagentResume, { superagent: s.world.superagent })),
    s.step("the executor is running", s.clock.settle()),
    s.step("ann stops the ticket: closing, the seat held", s.ann.run(ticketStop, { superagent: s.world.superagent, ticket: s.world.ticket }), emits(AssignmentInterrupted, { seat: 1n })),
    s.step("twenty seconds pass: the row is younger than a sweep, so nothing is resent", s.clock.advance("20 seconds"), noEvents()),
    s.step("a minute more: it is older than a sweep, the sweep sends the close again, and the Agent acknowledges",
      s.clock.advance("1 minute"), emits(AgentClosed, { agent: s.world.executor }), emits(AssignmentEnded, { seat: 1n })),
    s.step("the seat was freed once, by the one acknowledgement", outbox.rows({ name: "AssignmentEnded", to: "op:superagent.fill", afterSeq: "journey" }), expect((a) => a.rows.length).toBe(1)),
    s.step("and the stopped ticket was given no new Assignment", outbox.rows({ name: "AssignmentQueued", afterSeq: "journey" }), expect((a) => a.rows.length).toBe(0)),
  ],
});
