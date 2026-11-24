// Slice 8: "a person's message after a CI result promotes the pending Assignment". GOAL17-executor-slots, section 5: a CI result for an idle
// ticket queues an Assignment (`why: "input"`) that waits for a pool seat; a person's message to the same ticket promotes that one Assignment
// (no second one), the reserve answers it, and the opening tell carries the CI result, then the person's message.
import { Blueprint, emits, expect } from "orthograph";
import { models, told, outbox } from "../kit/doors.ts";
import type { Told } from "../kit/doors.ts";
import { AssignmentQueued, AssignmentStarted, AssignmentEnded, AssignmentPromoted, ticketAccept, inputStore, agentOpen, listed } from "../kit/ops.ts";
import { acceptOf, executorOf, turnSay } from "../kit/steps.ts";

const say = (s: { world: Record<string, unknown> }, thread: string, from: "person" | "system", text: string) => ({ superagent: s.world["superagent"], thread, from, text });

export default Blueprint.journey("a person's message after a CI result promotes the pending Assignment", {
  cast: { gh: listed, sys: Blueprint.system },
  starts: "a-listed-account",
  steps: (s) => [
    s.step("the second ticket answers its first message at once, then its next ones", models.script({ for: executorOf("ticket/one"), turns: [turnSay("B one."), turnSay("B two.", "before-reply")] })),
    s.step("the first ticket's turn stays open", models.script({ for: executorOf("ticket/a"), turns: [turnSay("A.", "before-reply")] })),
    s.step("ticket b is accepted, for the executor the world opened", s.gh.run(ticketAccept, acceptOf(s, { agent: s.world.executor, thread: "issue/2", text: "@agent fix b" }))),
    s.step("it runs, answers and idles: the seat is free", s.clock.settle(), emits(AssignmentEnded, { seat: 1n })),
    s.step("an executor for ticket a", s.sys.run(agentOpen, { kind: "executor", about: "ticket/a" })),
    s.step("ticket a is accepted", s.gh.run(ticketAccept, acceptOf(s, { agent: s.last.agent, thread: "issue/1", text: "@agent fix a" }))),
    s.step("ticket a takes the pool's one seat and holds it", s.clock.settle(), emits(AssignmentStarted, { seat: 1n })),
    s.step("a CI result arrives for ticket b", s.sys.run(inputStore, say(s, "issue/2", "system", "CI failed: login.test"))),
    s.step("its idle executor needs a seat, and the pool is full: a pending Assignment waits, for an input", s.clock.settle(), emits(AssignmentQueued, { why: "input" })),
    s.step("a person writes on ticket b", s.sys.run(inputStore, say(s, "issue/2", "person", "please look at the CI failure"))),
    s.step("that Assignment is promoted, and the reserve seats it for the person", s.clock.settle(), emits(AssignmentPromoted, {}), emits(AssignmentStarted, { seat: 255n, why: "person" })),
    s.step("three Assignments were queued in all: b's first, a's, and the CI result's; the person's message made none", outbox.rows({ name: "AssignmentQueued", afterSeq: "journey" }),
      expect((a) => a.rows.length).toBe(3)),
    s.step("ticket b's executor heard its first message, then the CI result, then the person, in order", told({ agent: s.world.executor }),
      expect((a) => a.inputs.map((i: Told) => [i.text, i.how])).toEqual([["@agent fix b", "submitted"], ["CI failed: login.test", "submitted"], ["please look at the CI failure", "steered"]]),
      expect((a) => a.inputs[0].assignment !== null && a.inputs[1].assignment !== null && a.inputs[1].assignment !== a.inputs[0].assignment && a.inputs[2].assignment === a.inputs[1].assignment).toBe(true)),
    s.step("ticket a's turn was not pre-empted to make room: nothing was interrupted", outbox.rows({ name: "AssignmentInterrupted", afterSeq: "journey" }), expect((a) => a.rows.length).toBe(0)),
  ],
});
