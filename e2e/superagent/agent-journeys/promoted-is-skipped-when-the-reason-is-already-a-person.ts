// Slice 8: "`promoted` is skipped when `why` is already `person`, and leaves a launch's `why` alone". GOAL17-names / slice 2's last review: a second
// person's message to an Assignment already waiting as a person's makes no second `AssignmentPromoted`, and a CI result for a waiting launch
// does not promote it. Pool of one seat: ticket a holds it, ticket m takes the reserve, ticket d waits as a launch (older), and b, which a
// person writes on, waits as a person's, ahead of d though it is the younger.
import { Blueprint, emits, expect } from "orthograph";
import { models, outbox } from "../kit/doors.ts";
import { InputStored, AssignmentStarted, AssignmentPromoted, ticketAccept, inputStore, assignmentWaiting, agentOpen, listed } from "../kit/ops.ts";
import { acceptOf, turnSay } from "../kit/steps.ts";

const say = (s: { world: Record<string, unknown> }, thread: string, from: "person" | "system", text: string) => ({ superagent: s.world["superagent"], thread, from, text });
// The executor the step before opened is `s.last.agent`: a ref, read when the accept runs.
const ticketOn = (s: any, thread: string) => acceptOf(s, { agent: s.last.agent, thread, text: `@agent fix ${thread}` });

export default Blueprint.journey("promoted is skipped when the reason is already a person", {
  cast: { gh: listed, sys: Blueprint.system },
  starts: "a-listed-account",
  steps: (s) => [
    s.step("the turns of the two tickets that run stay open", models.script({ for: { kind: "executor" }, turns: [turnSay("a.", "before-reply"), turnSay("m.", "before-reply")] })),
    s.step("an executor for ticket a", s.sys.run(agentOpen, { kind: "executor", about: "ticket/a" })),
    s.step("ticket a takes the pool's seat", s.gh.run(ticketAccept, ticketOn(s, "issue/1"))),
    s.step("seated", s.clock.settle(), emits(AssignmentStarted, { seat: 1n })),
    s.step("an executor for ticket m", s.sys.run(agentOpen, { kind: "executor", about: "ticket/m" })),
    s.step("ticket m waits", s.gh.run(ticketAccept, ticketOn(s, "issue/2"))),
    s.step("a person writes on m: it takes the reserve", s.sys.run(inputStore, say(s, "issue/2", "person", "start this one")), emits(InputStored, {})),
    s.step("promoted once, and seated in the reserve", s.clock.settle(), emits(AssignmentPromoted, {}), emits(AssignmentStarted, { seat: 255n, why: "person" })),
    s.step("an executor for ticket d", s.sys.run(agentOpen, { kind: "executor", about: "ticket/d" })),
    s.step("ticket d waits as a launch, the older of the two that wait", s.gh.run(ticketAccept, ticketOn(s, "issue/4"))),
    s.step("an executor for ticket b", s.sys.run(agentOpen, { kind: "executor", about: "ticket/b" })),
    s.step("ticket b waits, the younger", s.gh.run(ticketAccept, ticketOn(s, "issue/3"))),
    s.step("a person writes on b", s.sys.run(inputStore, say(s, "issue/3", "person", "and this one")), emits(InputStored, {})),
    s.step("b is promoted, and waits: the reserve is held", s.clock.settle(), emits(AssignmentPromoted, {})),
    s.step("a second person's message on b", s.sys.run(inputStore, say(s, "issue/3", "person", "I mean it")), emits(InputStored, {})),
    s.step("the world settles after the second message", s.clock.settle()),
    s.step("two promotions in all, m's and b's: the second message on b promoted nothing", outbox.rows({ name: "AssignmentPromoted", afterSeq: "journey" }), expect((a) => a.rows.length).toBe(2)),
    s.step("a CI result for d", s.sys.run(inputStore, say(s, "issue/4", "system", "CI passed")), emits(InputStored, {})),
    s.step("the world settles after the CI result", s.clock.settle()),
    s.step("still two promotions: a CI result promotes no launch", outbox.rows({ name: "AssignmentPromoted", afterSeq: "journey" }), expect((a) => a.rows.length).toBe(2)),
    s.step("b waits as a person's, ahead of the older launch d, whose reason the CI result left alone", s.sys.run(assignmentWaiting, { superagent: s.world.superagent }),
      expect((a) => a.items.map((i: { why: string }) => i.why)).toEqual(["person", "launch"])),
  ],
});
