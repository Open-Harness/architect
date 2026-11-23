// Slice 8: "a stop on a full pool starts nothing until `AgentClosed`, and `fill` does not loop". GOAL17-executor-slots, section 4: a stop leaves the
// Assignment `closing`, which keeps its seat; the freed seat is refilled only when the Agent acknowledges the close.
import { Blueprint, emits, expect } from "orthograph";
import { models, outbox } from "../kit/doors.ts";
import { AssignmentStarted, AssignmentInterrupted, AssignmentEnded, AgentClosed, superagentResume, ticketStop, superagentFill, assignmentWaiting } from "../kit/ops.ts";
import { executorOf, turnSay } from "../kit/steps.ts";

export default Blueprint.journey("a stop on a full pool starts nothing until AgentClosed", {
  cast: { ann: Blueprint.signedIn, sys: Blueprint.system },
  starts: "two-paused-tickets",
  steps: (s) => [
    s.step("the first executor's turn stays open", models.script({ for: executorOf("ticket/one"), turns: [turnSay("One.", "before-reply")] })),
    s.step("the second executor answers", models.script({ for: executorOf("ticket/two"), turns: [turnSay("Two.")] })),
    s.step("the stop's close is parked on its way to the Agent", outbox.hold({ name: "AssignmentInterrupted", to: "op:agent.close" })),
    s.step("ann resumes the superagent", s.ann.run(superagentResume, { superagent: s.world.superagent })),
    s.step("the first ticket takes the one seat; the second waits", s.clock.settle(), emits(AssignmentStarted, { agent: s.world.executor, seat: 1n })),
    s.step("ann stops the first ticket: its Assignment is closing and keeps the seat", s.ann.run(ticketStop, { superagent: s.world.superagent, ticket: s.world.ticket }), emits(AssignmentInterrupted, { seat: 1n })),
    s.step("twenty seconds pass with the close still parked", s.clock.advance("20 seconds")),
    s.step("the second ticket is still waiting", s.sys.run(assignmentWaiting, { superagent: s.world.superagent }), expect((a) => a.items.length).toBe(1)),
    s.step("a fill, called by hand, starts nothing", s.sys.run(superagentFill, { superagent: s.world.superagent }), expect((a) => Number(a.started)).toBe(0)),
    s.step("only the first seating has happened", outbox.rows({ name: "AssignmentStarted", to: "op:agent.tell", afterSeq: "journey" }), expect((a) => a.rows.length).toBe(1)),
    s.step("fill ran for the resume and for nothing else: it does not loop", outbox.rows({ to: "op:superagent.fill", afterSeq: "journey" }), expect((a) => a.rows.length).toBe(1)),
    s.step("the close is let go", outbox.release({ hold: "all" })),
    s.step("the Agent acknowledges it; only then is the seat free and given to the second ticket", s.clock.settle(),
      emits(AgentClosed, { agent: s.world.executor }), emits(AssignmentEnded, { seat: 1n }), emits(AssignmentStarted, { agent: s.world.executorTwo, seat: 1n })),
    s.step("a minute more", s.clock.advance("1 minute")),
    s.step("fill ran for the resume and for each seat that freed, the first ticket's and the second's own turn: three, and it does not loop", outbox.rows({ to: "op:superagent.fill", afterSeq: "journey" }), expect((a) => a.rows.length).toBe(3)),
    s.step("two seatings in all", outbox.rows({ name: "AssignmentStarted", to: "op:agent.tell", afterSeq: "journey" }), expect((a) => a.rows.length).toBe(2)),
  ],
});
