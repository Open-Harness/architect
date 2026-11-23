// Slice 8: "a message routed as a turn ends gets a new seat, and an executor is never steered without one". GOAL17-executor-slots, section 5:
// a steer is parked after `route` saw a running Assignment, the turn ends and its seat frees, and the parked tell reaches an Agent whose
// `current` is gone. The Agent refuses it (`StaleAssignment`), the hop's `onRefused` path requeues the Input, a new Assignment is
// seated, and the Input is told as an opening tell: submitted, never steered.
import { Blueprint, emits, expect } from "orthograph";
import { models, told, calls, outbox } from "../kit/doors.ts";
import type { Told, ModelStep, Row } from "../kit/doors.ts";
import { AssignmentQueued, AssignmentStarted, AssignmentEnded, InputStored, InputRouted, ticketAccept, inputStore, listed } from "../kit/ops.ts";
import { acceptOf, executorOf, turnSay } from "../kit/steps.ts";

export default Blueprint.journey("a message routed as a turn ends gets a new seat", {
  cast: { gh: listed, sys: Blueprint.system },
  starts: "an-executor-waits",
  steps: (s) => [
    s.step("the first turn is held at the model; the second answers at once", models.script({ for: executorOf("ticket/one"), turns: [turnSay("First.", "before-reply"), turnSay("Second.")] })),
    s.step("a mention makes a ticket", s.gh.run(ticketAccept, acceptOf(s, { agent: s.world.executor }))),
    s.step("the executor is running in its seat", s.clock.settle(), emits(AssignmentStarted, { agent: s.world.executor, seat: 1n })),
    s.step("every steer to the executor is parked", outbox.hold({ name: "InputRouted", to: "op:agent.tell" }), expect((a) => a.held).toBe(0)),
    s.step("a person writes while it works", s.sys.run(inputStore, { superagent: s.world.superagent, thread: "issue/12", from: "person", text: "one more thing" }), emits(InputStored, {})),
    s.step("route saw a running Assignment and routed it; the tell waits, untried", s.clock.settle(), emits(InputRouted, { agent: s.world.executor })),
    s.step("the parked row is pending, held, never attempted", outbox.rows({ name: "InputRouted" }),
      expect((a) => a.rows.map((r: Row) => [r.state, r.attempts, r.hold !== null])).toEqual([["pending", 0, true]])),
    s.step("the model is let go and the turn ends", models.release({ hold: "all" })),
    s.step("the Agent idled, and its seat is free", s.clock.settle(), emits(AssignmentEnded, { seat: 1n })),
    s.step("the parked steer is let go", outbox.release({ hold: "all" })),
    s.step("the Agent refuses it; the Input is requeued, a new Assignment queued and seated", s.clock.settle(),
      emits(InputStored, {}), emits(AssignmentQueued, { why: "person" }), emits(AssignmentStarted, { agent: s.world.executor, seat: 1n })),
    s.step("the refused row is done at the first try, carrying the error's name", outbox.rows({ name: "InputRouted" }),
      expect((a) => a.rows.map((r: Row) => [r.state, r.outcome, r.attempts])).toEqual([["delivered", "StaleAssignment", 0]])),
    s.step("the second message reached the executor as an opening tell for a new Assignment, never as a steer", told({ agent: s.world.executor }),
      expect((a) => [a.inputs.map((i: Told) => [i.text, i.how]), a.inputs[0].assignment !== null && a.inputs[1].assignment !== null && a.inputs[0].assignment !== a.inputs[1].assignment])
        .toEqual([[["@agent fix the flaky login test", "submitted"], ["one more thing", "submitted"]], true])),
    s.step("two submissions, a round each", calls({ agent: s.world.executor }), expect((a) => a.steps.map((m: ModelStep) => m.round)).toEqual([1, 1])),
    s.step("every scripted turn was used", models.done({}), expect((a) => a.unused).toBe(0)),
    s.step("two Assignments were queued in all, the first and the new one: the refusal made no more", outbox.rows({ name: "AssignmentQueued", afterSeq: "journey" }), expect((a) => a.rows.length).toBe(2)),
  ],
});
