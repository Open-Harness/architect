// Slice 8: "one executor per ticket, found again after a restart". Author-owned: a builder never edits it.
import { Blueprint, emits, expect } from "orthograph";
import { models, told, calls, outbox } from "../kit/doors.ts";
import type { Told, ModelStep } from "../kit/doors.ts";
import { AssignmentStarted, InputStored, superagentResume, inputStore } from "../kit/ops.ts";
import { executorOf, turnSay } from "../kit/steps.ts";
import { SLACK_THREAD } from "../kit/consts.ts";

export default Blueprint.journey("one executor per ticket, found again after a restart", {
  cast: { ann: Blueprint.signedIn, sys: Blueprint.system },
  starts: "a-paused-ticket",
  steps: (s) => [
    s.step("the executor answers twice", models.script({ for: executorOf("ticket/one"), turns: [turnSay("Looking."), turnSay("Again.")] })),
    s.step("ann resumes the superagent: the ticket's queued Assignment is seated for the executor it was given", s.ann.run(superagentResume, { superagent: s.world.superagent })),
    s.step("the executor of that ticket takes seat one", s.clock.settle(), emits(AssignmentStarted, { agent: s.world.executor, ticket: s.world.ticket, seat: 1n })),
    s.step("the executor was told the mention, once", told({ agent: s.world.executor }),
      expect((a) => a.inputs.map((i: Told) => [i.text, i.how, i.assignment !== null])).toEqual([["<@U0BOT0001> fix the flaky login test", "submitted", true]])),
    s.step("the runner is killed and started again", s.runner.restart()),
    s.step("a person writes on the same thread; the ticket is found by it", s.sys.run(inputStore, { superagent: s.world.superagent, thread: SLACK_THREAD, from: "person", text: "and the signup test" }),
      emits(InputStored, { superagent: s.world.superagent, ticket: s.world.ticket })),
    s.step("the idle executor gets a new seat: the same executor, for the same ticket", s.clock.settle(), emits(AssignmentStarted, { agent: s.world.executor, ticket: s.world.ticket, seat: 1n })),
    s.step("it holds both messages, in order, each opened under its own Assignment", told({ agent: s.world.executor }),
      expect((a) => a.inputs.map((i: Told) => [i.text, i.how])).toEqual([["<@U0BOT0001> fix the flaky login test", "submitted"], ["and the signup test", "submitted"]]),
      expect((a) => a.inputs[0].assignment !== null && a.inputs[1].assignment !== null && a.inputs[0].assignment !== a.inputs[1].assignment).toBe(true)),
    s.step("its two submissions are two model rounds, one each, none repeated", calls({ agent: s.world.executor }),
      expect((a) => a.steps.map((m: ModelStep) => [m.round, m.text])).toEqual([[1, "Looking."], [1, "Again."]])),
    s.step("two seatings, both of the one executor", outbox.rows({ name: "AssignmentStarted", to: "op:agent.tell", afterSeq: "journey" }),
      expect((a) => a.rows.length).toBe(2)),
    s.step("every scripted turn was used", models.done({}), expect((a) => a.unused).toBe(0)),
  ],
});
