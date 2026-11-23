// Slice 8: "reap, restart and redeliver leave a late idle for one Assignment unable to end the next". GOAL17-executor-slots, "Two writers": `turnEnded`
// takes the Assignment id from the event, so A1's idle, delivered after A2 has started, meets `notFrom` on A1 and cannot end A2.
// To make it late, the first idle is parked: reap (not the idle) ends A1, a person's message seats A2, and only then is the idle let go, and
// redelivered, with a restart between.
import { Blueprint, emits, noEvents, expect } from "orthograph";
import { models, outbox } from "../kit/doors.ts";
import type { Row } from "../kit/doors.ts";
import { AssignmentStarted, AssignmentEnded, AssignmentInterrupted, AgentClosed, superagentResume, inputStore } from "../kit/ops.ts";
import { executorOf, turnSay } from "../kit/steps.ts";
import { SLACK_THREAD } from "../kit/consts.ts";

export default Blueprint.journey("reap, restart and redeliver leave a late idle for one Assignment unable to end the next", {
  cast: { ann: Blueprint.signedIn, sys: Blueprint.system },
  starts: "a-paused-ticket",
  steps: (s) => [
    s.step("the first turn answers; the second stays open, and is asked again after the restart", models.script({ for: executorOf("ticket/one"), turns: [turnSay("One."), turnSay("Two.", "before-reply"), turnSay("Two.", "before-reply")] })),
    s.step("the Agent's idle is parked, so it will arrive late", outbox.hold({ name: "AgentIdled", to: "op:assignment.turnEnded" })),
    s.step("ann resumes the superagent", s.ann.run(superagentResume, { superagent: s.world.superagent })),
    s.step("the first turn is over and the Agent idle, with the Assignment still holding the seat", s.clock.settle(), emits(AssignmentStarted, { agent: s.world.executor, seat: 1n })),
    s.step("two sweeps pass: reap closes the first Assignment, and the Agent's acknowledgement ends it",
      s.clock.advance("2 minutes"), emits(AssignmentInterrupted, { seat: 1n }), emits(AgentClosed, { agent: s.world.executor }), emits(AssignmentEnded, { seat: 1n })),
    s.step("a person writes: a second Assignment", s.sys.run(inputStore, { superagent: s.world.superagent, thread: SLACK_THREAD, from: "person", text: "and another thing" })),
    s.step("the second Assignment is running, its turn open at the model", s.clock.settle(), emits(AssignmentStarted, { agent: s.world.executor, seat: 1n })),
    s.step("the runner is killed and started again", s.runner.restart()),
    s.step("the world settles: the turn is asked again and is held", s.clock.settle()),
    s.step("the first Assignment's idle is let go at last", outbox.release({ hold: "all" }), expect((a) => a.released).toBe(1)),
    s.step("the late idle, delivered, ended nothing", s.clock.settle(), noEvents()),
    s.step("the first Assignment's idle, as the outbox keeps it", outbox.rows({ name: "AgentIdled", to: "op:assignment.turnEnded", afterSeq: "journey" }), expect((a) => a.rows.length).toBe(1)),
    s.step("it is delivered again", outbox.redeliver({ event: s.last.rows[0].event }), expect((a) => a.redelivered).toBe(1)),
    s.step("the world settles: the second late idle ended nothing either", s.clock.settle(), noEvents()),
    s.step("only the first Assignment has ended", outbox.rows({ name: "AssignmentEnded", to: "op:superagent.fill", afterSeq: "journey" }), expect((a) => a.rows.map((r: Row) => r.state)).toEqual(["delivered"])),
    s.step("the model is let go and the second turn ends on its own idle", models.release({ hold: "all" })),
    s.step("its idle is let go too", outbox.release({ hold: "all" })),
    s.step("now the second Assignment ends", s.clock.settle(), emits(AssignmentEnded, { seat: 1n })),
  ],
});
