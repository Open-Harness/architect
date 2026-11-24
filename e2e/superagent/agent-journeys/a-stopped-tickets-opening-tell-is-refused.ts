// Slice 8: "a stopped ticket's opening tell is refused". GOAL17-executor-slots, section 5: a stop reaches the Agent before the opening tell does
// (the tell is parked), the Agent records the Assignment as closed, and the late tell is refused (`StaleAssignment`) on the hop's
// `onRefused` path. The executor never wakes: no input told, no model step, no model request.
import { Blueprint, emits, expect } from "orthograph";
import { models, told, calls, outbox } from "../kit/doors.ts";
import type { Row } from "../kit/doors.ts";
import { AssignmentStarted, AssignmentInterrupted, AssignmentEnded, AgentClosed, InputStored, superagentResume, ticketStop } from "../kit/ops.ts";

export default Blueprint.journey("a stopped ticket's opening tell is refused", {
  cast: { ann: Blueprint.signedIn },
  starts: "a-paused-ticket",
  steps: (s) => [
    s.step("the opening tell is parked", outbox.hold({ name: "AssignmentStarted", to: "op:agent.tell" })),
    s.step("ann resumes the superagent", s.ann.run(superagentResume, { superagent: s.world.superagent })),
    s.step("the seat is taken and the tell waits", s.clock.settle(), emits(AssignmentStarted, { agent: s.world.executor, seat: 1n })),
    s.step("ann stops the ticket", s.ann.run(ticketStop, { superagent: s.world.superagent, ticket: s.world.ticket }), emits(AssignmentInterrupted, { seat: 1n })),
    s.step("the Agent acknowledges the close, which frees the seat", s.clock.settle(), emits(AgentClosed, { agent: s.world.executor }), emits(AssignmentEnded, { seat: 1n })),
    s.step("the late opening tell is let go", outbox.release({ hold: "all" })),
    s.step("the Agent refuses it, and its Input is put back to waiting", s.clock.settle(), emits(InputStored, { ticket: s.world.ticket })),
    s.step("the Agent refused it: the row is done at the first try, carrying the error's name", outbox.rows({ name: "AssignmentStarted", to: "op:agent.tell" }),
      expect((a) => a.rows.map((r: Row) => [r.state, r.outcome, r.attempts])).toEqual([["delivered", "StaleAssignment", 0]])),
    s.step("the executor was told nothing", told({ agent: s.world.executor }), expect((a) => a.inputs.length).toBe(0)),
    s.step("and took no model step", calls({ agent: s.world.executor }), expect((a) => a.steps.length).toBe(0)),
    s.step("and the model was never asked", models.seen({}), expect((a) => a.requests.length).toBe(0)),
    s.step("the stopped ticket queued no new Assignment", outbox.rows({ name: "AssignmentQueued", afterSeq: "journey" }), expect((a) => a.rows.length).toBe(0)),
  ],
});
