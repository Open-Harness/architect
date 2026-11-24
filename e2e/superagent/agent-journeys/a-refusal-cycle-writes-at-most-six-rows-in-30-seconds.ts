// Slice 8: "a refusal cycle writes at most six rows in 30 seconds". GOAL17-executor-slots, section 5: for the few moments between the Agent idling and
// `turnEnded` committing, a steer is refused and requeued; the requeue backs off (1 s doubling to 30 s) so the cycle costs rows, bounded.
// Here `turnEnded` is parked, so the cycle runs as long as the check lets it, and the count is read over thirty seconds of the world's clock.
import { Blueprint, emits, expect } from "orthograph";
import { models, told, outbox } from "../kit/doors.ts";
import type { Told, Row } from "../kit/doors.ts";
import { AssignmentStarted, superagentResume, inputStore } from "../kit/ops.ts";
import { executorOf, turnSay } from "../kit/steps.ts";
import { SLACK_THREAD } from "../kit/consts.ts";

const toRoute = (rows: ReadonlyArray<Row>) => rows.filter((r) => r.to === "op:input.route");
const refused = (rows: ReadonlyArray<Row>) => rows.filter((r) => r.name === "InputRouted");

export default Blueprint.journey("a refusal cycle writes at most six rows in 30 seconds", {
  cast: { ann: Blueprint.signedIn, sys: Blueprint.system },
  starts: "a-paused-ticket",
  steps: (s) => [
    s.step("the first turn answers and ends; the second answers the person", models.script({ for: executorOf("ticket/one"), turns: [turnSay("One."), turnSay("Two.")] })),
    s.step("the Agent's idle is parked, so its Assignment keeps its seat", outbox.hold({ name: "AgentIdled", to: "op:assignment.turnEnded" })),
    s.step("ann resumes the superagent", s.ann.run(superagentResume, { superagent: s.world.superagent })),
    s.step("the turn is over and the Agent is idle, with the Assignment still running", s.clock.settle(), emits(AssignmentStarted, { seat: 1n })),
    s.step("a person writes: route sees a running Assignment and the Agent will refuse the steer", s.sys.run(inputStore, { superagent: s.world.superagent, thread: SLACK_THREAD, from: "person", text: "one more thing" })),
    s.step("thirty seconds of the world's clock pass", s.clock.advance("30 seconds")),
    s.step("the cycle ran, so this check is not passing by never starting it", outbox.rows({ afterSeq: "journey" }),
      expect((a) => [toRoute(a.rows).length >= 2, refused(a.rows).length >= 2]).toEqual([true, true])),
    s.step("and the requeues wrote at most six rows to `input.route` in the thirty seconds", outbox.rows({ afterSeq: "journey" }),
      expect((a) => toRoute(a.rows).length <= 6).toBe(true)),
    s.step("the refusals are the Agent's, one per row, none retried by the outbox", outbox.rows({ name: "InputRouted", afterSeq: "journey" }),
      expect((a) => a.rows.length >= 1 && a.rows.every((r: Row) => r.state === "delivered" && r.outcome === "StaleAssignment" && r.attempts === 0)).toBe(true)),
    s.step("the idle is let go and the cycle ends", outbox.release({ hold: "all" })),
    s.step("the world settles: a new Assignment is seated", s.clock.settle(), emits(AssignmentStarted, { agent: s.world.executor, seat: 1n })),
    s.step("the person's message was told once, as an opening tell", told({ agent: s.world.executor }),
      expect((a) => a.inputs.map((i: Told) => [i.text, i.how])).toEqual([["<@U0BOT0001> fix the flaky login test", "submitted"], ["one more thing", "submitted"]]),
      expect((a) => a.inputs[0].assignment !== null && a.inputs[1].assignment !== null && a.inputs[1].assignment !== a.inputs[0].assignment).toBe(true)),
  ],
});
