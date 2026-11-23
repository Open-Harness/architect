// Slice 8: "a message while it works steers it". GOAL17-check-harness, call 1's example, on this blueprint's real operations.
import { Blueprint, emits, expect } from "orthograph";
import { models, told, calls, outbox } from "../kit/doors.ts";
import type { Told, ModelStep } from "../kit/doors.ts";
import { AssignmentStarted, InputStored, InputRouted, InputDelivered, ticketAccept, inputStore, listed } from "../kit/ops.ts";
import { acceptOf, executorOf, turnBash, turnSay } from "../kit/steps.ts";

export default Blueprint.journey("a message while it works steers it", {
  cast: { gh: listed, sys: Blueprint.system },
  starts: "an-executor-waits",
  steps: (s) => [
    s.step("the first round is a command, held open", models.script({ for: executorOf("ticket/one"), turns: [turnBash("echo one", "before-reply"), turnSay("Added both.")] })),
    s.step("a mention makes a ticket", s.gh.run(ticketAccept, acceptOf(s, { agent: s.world.executor }))),
    s.step("the executor takes its seat", s.clock.settle(), emits(AssignmentStarted, { agent: s.world.executor, seat: 1n })),
    s.step("the turn is open at the model", models.held({ match: { nth: 1 }, count: 1 }), expect((a) => a.held.length).toBe(1)),
    s.step("a person writes while it is held", s.sys.run(inputStore, { superagent: s.world.superagent, thread: "issue/12", from: "person", text: "also the edge case" }),
      emits(InputStored, { superagent: s.world.superagent })),
    s.step("the message is routed to the running executor, with no new seat", s.clock.settle(), emits(InputRouted, { agent: s.world.executor })),
    s.step("the model is let go", models.release({ hold: "all" }), expect((a) => a.released).toBe(1)),
    s.step("the world settles and the steer is delivered", s.clock.settle(), emits(InputDelivered, {})),
    s.step("the executor was submitted the mention and steered the edge case", told({ agent: s.world.executor }),
      expect((a) => a.inputs.map((i: Told) => [i.text, i.how])).toEqual([["@agent fix the flaky login test", "submitted"], ["also the edge case", "steered"]]),
      expect((a) => a.inputs[0].assignment !== null && a.inputs[1].assignment === a.inputs[0].assignment).toBe(true)),
    s.step("two committed rounds, the second after the steer", calls({ agent: s.world.executor }), expect((a) => a.steps.map((m: ModelStep) => m.round)).toEqual([1, 2])),
    s.step("the model was asked twice and told the edge case in the second request only", models.seen({ containing: "also the edge case" }), expect((a) => a.requests.map((r: { n: number }) => r.n)).toEqual([2])),
    s.step("the steer cost no second launch", outbox.rows({ name: "AssignmentStarted", to: "op:agent.tell", afterSeq: "journey" }), expect((a) => a.rows.length).toBe(1)),
    s.step("every scripted turn was used", models.done({}), expect((a) => a.unused).toBe(0)),
  ],
});
