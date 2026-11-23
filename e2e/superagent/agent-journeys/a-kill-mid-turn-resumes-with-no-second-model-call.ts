// Slice 8: "a kill mid-turn resumes with no second committed model call". GOAL17-check-harness call 2's mid-turn twin: the stand-in
// holds the second reply, the runner is killed, and the Agent resumes from its last committed step. Asked is not committed:
// the model sees three requests, the Agent stores two steps.
import { Blueprint, expect } from "orthograph";
import { models, told, calls, outbox } from "../kit/doors.ts";
import type { Told, ModelStep } from "../kit/doors.ts";
import { ticketAccept, listed } from "../kit/ops.ts";
import { acceptOf, executorOf, turnBash, turnSay } from "../kit/steps.ts";

export default Blueprint.journey("a kill mid-turn resumes with no second committed model call", {
  cast: { gh: listed },
  starts: "an-executor-waits",
  steps: (s) => [
    s.step("round one is a command; round two is held, and asked again after the kill", models.script({ for: executorOf("ticket/one"), turns: [turnBash("echo one"), turnSay("Done.", "before-reply"), turnSay("Done.")] })),
    s.step("a mention makes a ticket", s.gh.run(ticketAccept, acceptOf(s, { agent: s.world.executor }))),
    s.step("the world settles", s.clock.settle()),
    s.step("the second reply is held at the model", models.held({ match: { nth: 2 }, count: 1 }), expect((a) => a.held.length).toBe(1)),
    s.step("the runner is killed, with nothing cleaned up", s.runner.kill("SIGKILL"), expect((a) => a.pid > 0).toBe(true)),
    s.step("and started again on the same state", s.runner.start()),
    s.step("the cut request is let go", models.release({ hold: "all" })),
    s.step("the world settles after the restart", s.clock.settle()),
    s.step("two committed rounds, never a repeated one", calls({ agent: s.world.executor }), expect((a) => a.steps.map((m: ModelStep) => m.round)).toEqual([1, 2])),
    s.step("the model was asked three times: the cut one counts", models.seen({}), expect((a) => a.requests.length).toBe(3)),
    s.step("the executor was told its opening message once", told({ agent: s.world.executor }), expect((a) => a.inputs.map((i: Told) => [i.text, i.how, i.assignment !== null])).toEqual([["@agent fix the flaky login test", "submitted", true]])),
    s.step("every scripted turn was used", models.done({}), expect((a) => a.unused).toBe(0)),
    s.step("the restart seated nothing again", outbox.rows({ name: "AssignmentStarted", to: "op:agent.tell", afterSeq: "journey" }), expect((a) => a.rows.length).toBe(1)),
  ],
});
