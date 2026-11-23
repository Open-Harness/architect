// Slice 8: "`reap`'s `idleSeenAt` grace". GOAL17-executor-slots, "Reap grace": `reap` closes an idle running Assignment only after it has stayed idle for
// one whole sweep (30 s). The Agent's idle is parked, so its Assignment stays running with an idle Agent. `reap` is called by hand, so the first
// sight of the idleness is at a known instant: a reap that closes then has no grace, whatever phase the world's own sweep has.
import { Blueprint, emits, noEvents, expect } from "orthograph";
import { models, outbox } from "../kit/doors.ts";
import { AssignmentStarted, AssignmentInterrupted, AssignmentEnded, AgentClosed, superagentResume, superagentReap } from "../kit/ops.ts";
import { executorOf, turnSay } from "../kit/steps.ts";

export default Blueprint.journey("reap closes an idle assignment only after a whole sweep", {
  cast: { ann: Blueprint.signedIn, sys: Blueprint.system },
  starts: "a-paused-ticket",
  steps: (s) => [
    s.step("the executor answers at once", models.script({ for: executorOf("ticket/one"), turns: [turnSay("Done.")] })),
    s.step("the Agent's idle is parked, so nothing but reap can free the seat", outbox.hold({ name: "AgentIdled", to: "op:assignment.turnEnded" })),
    s.step("ann resumes the superagent", s.ann.run(superagentResume, { superagent: s.world.superagent })),
    s.step("the Agent is idle and its Assignment still holds the seat", s.clock.settle(), emits(AssignmentStarted, { agent: s.world.executor, seat: 1n })),
    s.step("reap sees the Agent idle for the first time: it notes it and closes nothing", s.sys.run(superagentReap, { superagent: s.world.superagent }),
      expect((a) => Number(a.reaped)).toBe(0), noEvents()),
    s.step("twenty-nine seconds pass: not yet a whole sweep", s.clock.advance("29 seconds"), noEvents()),
    s.step("the Assignment is not closing", outbox.rows({ name: "AssignmentInterrupted", afterSeq: "journey" }), expect((a) => a.rows.length).toBe(0)),
    s.step("a whole sweep has now passed since it was first seen idle: reap closes it, and the Agent acknowledges",
      s.clock.advance("31 seconds"), emits(AssignmentInterrupted, { seat: 1n }), emits(AgentClosed, { agent: s.world.executor }), emits(AssignmentEnded, { seat: 1n })),
  ],
});
