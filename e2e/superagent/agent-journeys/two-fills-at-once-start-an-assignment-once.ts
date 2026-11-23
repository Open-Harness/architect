// Slice 8: "two sweeps don't double-start an Assignment". GOAL17-executor-slots, "Two writers": two `fill`s race on one pending Assignment and one
// free seat; the unique rule on (superagent, seat) refuses the loser, which re-reads. The event that would start it is parked, so the two
// calls are the only fills; the parked event's own fill then runs too, and the sweeps after it, and still nothing starts twice.
import { Blueprint, expect } from "orthograph";
import { models, told, outbox } from "../kit/doors.ts";
import type { Told } from "../kit/doors.ts";
import { ticketAccept, superagentFill, listed } from "../kit/ops.ts";
import { acceptOf, executorOf, turnSay } from "../kit/steps.ts";

export default Blueprint.journey("two fills at once start an Assignment once", {
  cast: { gh: listed, sys: Blueprint.system },
  starts: "an-executor-waits",
  steps: (s) => [
    s.step("every fill an Assignment's being queued would cause is parked, so the waiting Assignment stays waiting", outbox.hold({ name: "AssignmentQueued", to: "op:superagent.fill" })),
    s.step("the executor answers", models.script({ for: executorOf("ticket/one"), turns: [turnSay("Working.")] })),
    s.step("a mention makes a ticket and a waiting Assignment", s.gh.run(ticketAccept, acceptOf(s, { agent: s.world.executor }))),
    s.step("the world settles: nothing is seated", s.clock.settle()),
    s.step("two fills run at the same instant: one starts it, the other finds it started",
      s.together(s.sys.run(superagentFill, { superagent: s.world.superagent }), s.sys.run(superagentFill, { superagent: s.world.superagent })),
      expect((a) => a.answers.map((x: { started?: number | bigint }) => (x.started === undefined ? "refused" : Number(x.started))).sort()).toEqual([0, 1])),
    s.step("the world settles", s.clock.settle()),
    s.step("one Assignment was started", outbox.rows({ name: "AssignmentStarted", to: "op:agent.tell", afterSeq: "journey" }), expect((a) => a.rows.length).toBe(1)),
    s.step("the parked event's own fill is let go", outbox.release({ hold: "all" })),
    s.step("the world settles: that fill found nothing to start", s.clock.settle()),
    s.step("two sweeps pass", s.clock.advance("2 minutes")),
    s.step("and it is still one", outbox.rows({ name: "AssignmentStarted", to: "op:agent.tell", afterSeq: "journey" }), expect((a) => a.rows.length).toBe(1)),
    s.step("the executor was told its one input, once", told({ agent: s.world.executor }), expect((a) => a.inputs.map((i: Told) => i.how)).toEqual(["submitted"])),
  ],
});
