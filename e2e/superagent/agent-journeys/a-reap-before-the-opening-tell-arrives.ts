// Slice 8: "a reap before the opening tell arrives never frees a seat the executor then uses". GOAL17-check-harness, call 3's table, row one:
// the sweep takes an idle Agent for one whose turn ended and moves its Assignment to `closing` (the seat is still held); only the Agent's
// acknowledgement frees it. The late opening tell is then refused, the Input requeued, and a new Assignment holds the freed seat.
import { Blueprint, emits, expect } from "orthograph";
import { models, told, calls, outbox } from "../kit/doors.ts";
import type { Row, Told, ModelStep } from "../kit/doors.ts";
import { AssignmentStarted, AssignmentInterrupted, AssignmentEnded, AssignmentQueued, InputStored, AgentClosed, superagentResume } from "../kit/ops.ts";
import { executorOf, turnSay } from "../kit/steps.ts";

export default Blueprint.journey("a reap before the opening tell arrives never frees a seat the executor then uses", {
  cast: { ann: Blueprint.signedIn },
  starts: "a-paused-ticket",
  steps: (s) => [
    s.step("the opening tell is parked", outbox.hold({ name: "AssignmentStarted", to: "op:agent.tell" })),
    s.step("the executor, when it is at last told, answers", models.script({ for: executorOf("ticket/one"), turns: [turnSay("Fixed.")] })),
    s.step("ann resumes the superagent", s.ann.run(superagentResume, { superagent: s.world.superagent })),
    s.step("the seat is taken and the tell waits", s.clock.settle(), emits(AssignmentStarted, { agent: s.world.executor, seat: 1n })),
    s.step("two sweeps pass: the Agent is idle, which looks the same as a finished turn",
      s.clock.advance("2 minutes"), emits(AssignmentInterrupted, { seat: 1n }), emits(AgentClosed, { agent: s.world.executor }), emits(AssignmentEnded, { seat: 1n })),
    s.step("the model was never asked", models.seen({}), expect((a) => a.requests.length).toBe(0)),
    s.step("the late opening tell is let go", outbox.release({ hold: "all" })),
    s.step("the Agent refuses it; the Input is requeued and a new Assignment takes the freed seat", s.clock.settle(),
      emits(InputStored, {}), emits(AssignmentQueued, { why: "launch" }), emits(AssignmentStarted, { agent: s.world.executor, seat: 1n })),
    s.step("the refused row carries the error's name and was tried once; the second opening tell was delivered", outbox.rows({ name: "AssignmentStarted", to: "op:agent.tell" }),
      expect((a) => a.rows.map((r: Row) => [r.state, r.outcome === null ? "no refusal" : r.outcome, r.attempts])).toEqual([["delivered", "StaleAssignment", 0], ["delivered", "no refusal", 0]])),
    s.step("the executor was told its one input, once, as an opening tell", told({ agent: s.world.executor }),
      expect((a) => a.inputs.map((i: Told) => [i.how, i.assignment !== null])).toEqual([["submitted", true]])),
    s.step("one committed round, and one request to the model", calls({ agent: s.world.executor }), expect((a) => a.steps.map((m: ModelStep) => m.round)).toEqual([1])),
    s.step("the model was asked once, by the new Assignment only", models.seen({}), expect((a) => a.requests.length).toBe(1)),
    s.step("every scripted turn was used", models.done({}), expect((a) => a.unused).toBe(0)),
    s.step("the Agent's acknowledgement came before the seat was freed", outbox.rows({ afterSeq: "journey" }),
      expect((a) => { const closed = a.rows.find((r: Row) => r.name === "AgentClosed"); const ended = a.rows.find((r: Row) => r.name === "AssignmentEnded"); return closed !== undefined && ended !== undefined && closed.seq < ended.seq; }).toBe(true)),
  ],
});
