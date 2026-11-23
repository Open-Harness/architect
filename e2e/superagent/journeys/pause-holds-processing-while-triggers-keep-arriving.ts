// Slice 8: "pause holds evals, launches, deliveries and replies while triggers keep arriving, and moves an eval's deadline later by its length".
// GOAL17-pause. An eval is started by hand with a 60 s timeout (a stranger's trigger, so the eval pass starts no other); it is 40 s into its
// time when the superagent is paused for five minutes; it must not expire during the pause, and must expire 20 active seconds after the resume.
import { Blueprint, emits, noEvents, expect } from "orthograph";
import { models, told, outbox } from "../kit/doors.ts";
import type { Row } from "../kit/doors.ts";
import { AssignmentQueued, AssignmentStarted, EvalStarted, EvalExpired, SuperagentPaused, SuperagentResumed, TriggerReceived,
  superagentPause, superagentResume, triggerReceive, evalStart, ticketAccept, agentOpen, listed } from "../kit/ops.ts";
import { acceptOf, triggerOf, turnSay } from "../kit/steps.ts";
import { EVE, ANN } from "../kit/consts.ts";

const held = (rows: ReadonlyArray<Row>) => rows.filter((r) => r.state === "pending" && r.hold !== null && r.attempts === 0);

export default Blueprint.journey("pause holds processing while triggers keep arriving", {
  cast: { ann: Blueprint.signedIn, src: Blueprint.system, gh: listed },
  starts: "a-listed-account",
  steps: (s) => [
    s.step("the main agent answers the eval without deciding it", models.script({ for: { kind: "main" }, turns: [turnSay("Judged.")] })),
    s.step("the executor of a later ticket answers", models.script({ for: { kind: "executor" }, turns: [turnSay("Hello.")] })),
    s.step("a stranger's trigger is recorded, which the eval pass takes no notice of", s.src.run(triggerReceive, triggerOf(s, { thread: "issue/9", text: "an error report", author: EVE.external, event: "comment:9:created" }))),
    s.step("an eval of it is started, with sixty seconds to run", s.src.run(evalStart, { superagent: s.world.superagent, thread: "issue/9", triggers: [s.last.trigger], timeoutMs: 60000n }), emits(EvalStarted, {})),
    s.step("the eval is delivered to the main agent, whose turn is held: its clock starts", s.clock.settle()),
    s.step("the main agent was told the eval, once: nothing is held at a model while the clock moves", told({ agent: s.world.main }), expect((a) => a.inputs.length).toBe(1)),
    s.step("forty seconds of its sixty pass", s.clock.advance("40 seconds"), noEvents()),
    s.step("ann pauses the superagent", s.ann.run(superagentPause, { superagent: s.world.superagent }), emits(SuperagentPaused, { from: "live" })),
    s.step("a trigger keeps arriving, and is recorded", s.src.run(triggerReceive, triggerOf(s, { thread: "issue/10", text: "@agent please look", author: ANN.external, event: "comment:10:created" })), emits(TriggerReceived, { thread: "issue/10" })),
    s.step("an executor for a new ticket", s.src.run(agentOpen, { kind: "executor", about: "ticket/new" })),
    s.step("a new ticket is accepted during the pause: its Assignment is queued", s.gh.run(ticketAccept, acceptOf(s, { agent: s.last.agent, thread: "issue/11" })), emits(AssignmentQueued, { why: "launch" })),
    s.step("five minutes pass: no eval expires, no pass runs, no launch starts", s.clock.advance("5 minutes"), noEvents()),
    s.step("the launch, the acknowledgement of the new ticket and the eval's tell wait, untried, each under the pause's hold",
      outbox.rows({ state: "pending", afterSeq: "journey" }),
      expect((a) => held(a.rows).map((r: Row) => [r.name, r.to]).sort()).toEqual([
        ["AssignmentQueued", "op:superagent.fill"], ["TicketCreated", "op:outgoing-message.reply"]])),
    s.step("no launch has been seated", outbox.rows({ name: "AssignmentStarted", afterSeq: "journey" }), expect((a) => a.rows.length).toBe(0)),
    s.step("ann resumes: the pause was five minutes long", s.ann.run(superagentResume, { superagent: s.world.superagent }), emits(SuperagentResumed, { to: "live", length: 300000n })),
    s.step("the held work is released, in its order", s.clock.settle(), emits(AssignmentStarted, { seat: 1n })),
    s.step("nothing is held any more, and what was held was sent: the acknowledgement and the launch are delivered", outbox.rows({ afterSeq: "journey" }),
      expect((a) => held(a.rows).length).toBe(0),
      expect((a) => a.rows.filter((r: Row) => r.name === "TicketCreated" || r.name === "AssignmentQueued").map((r: Row) => r.state)).toEqual(["delivered", "delivered"])),
    s.step("nineteen more seconds pass: the eval has had fifty-nine of its sixty active seconds", s.clock.advance("19 seconds"), noEvents()),
    s.step("two more: it is out of time", s.clock.advance("2 seconds"), emits(EvalExpired, {})),
  ],
});
