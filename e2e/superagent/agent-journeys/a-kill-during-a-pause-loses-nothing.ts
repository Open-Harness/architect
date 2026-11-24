// Slice 8: GOAL17-pause, "A kill during a pause loses nothing": the world is killed while paused, started again, and is still paused with the
// same held rows and each trigger recorded once; on resume every held row is delivered once.
import { Blueprint, emits, expect } from "orthograph";
import { models, slack, outbox } from "../kit/doors.ts";
import type { Row } from "../kit/doors.ts";
import { AssignmentStarted, SuperagentResumed, superagentResume, triggerReceive } from "../kit/ops.ts";
import { executorOf, triggerOf, turnSay } from "../kit/steps.ts";
import { ANN, CHANNEL, SLACK_TS } from "../kit/consts.ts";

const heldRows = (rows: ReadonlyArray<Row>) => rows.filter((r) => r.state === "pending").map((r) => [r.name, r.to, r.attempts, r.hold !== null]).sort();
const BEFORE = [["AssignmentQueued", "op:superagent.fill", 0, true], ["TicketCreated", "op:outgoing-message.reply", 0, true]];

export default Blueprint.journey("a kill during a pause loses nothing", {
  cast: { ann: Blueprint.signedIn, src: Blueprint.system },
  starts: "a-paused-ticket",
  steps: (s) => [
    s.step("the executor answers once it is seated", models.script({ for: executorOf("ticket/one"), turns: [turnSay("Hello.")] })),
    s.step("two rows wait under the pause, untried", outbox.rows({ state: "pending" }), expect((a) => heldRows(a.rows)).toEqual(BEFORE)),
    s.step("a trigger arrives during the pause", s.src.run(triggerReceive, triggerOf(s, { thread: "issue/20", text: "@agent also this", author: ANN.external, event: "comment:20:created" }))),
    s.step("the runner is killed and started again", s.runner.restart()),
    s.step("the world settles after the restart", s.clock.settle()),
    s.step("the same two rows wait, still untried and still held", outbox.rows({ state: "pending" }), expect((a) => heldRows(a.rows)).toEqual(BEFORE)),
    s.step("the trigger was recorded once, and stored", outbox.rows({ name: "TriggerReceived", afterSeq: "journey" }), expect((a) => a.rows.map((r: Row) => r.state)).toEqual(["delivered"])),
    s.step("ann resumes", s.ann.run(superagentResume, { superagent: s.world.superagent }), emits(SuperagentResumed, { to: "live" })),
    s.step("the held rows are delivered: the Assignment is seated", s.clock.settle(), emits(AssignmentStarted, { agent: s.world.executor, seat: 1n })),
    s.step("each held row was delivered once", outbox.rows({ name: "TicketCreated" }), expect((a) => a.rows.map((r: Row) => [r.state, r.attempts <= 1])).toEqual([["delivered", true]])),
    s.step("the trigger is still one, and stored", outbox.rows({ name: "TriggerReceived", afterSeq: "journey" }), expect((a) => a.rows.map((r: Row) => r.state)).toEqual(["delivered"])),
    s.step("the held acknowledgement reached the thread exactly once", slack.replies({ channel: CHANNEL, thread: SLACK_TS }), expect((a) => a.replies.map((r: { text: string }) => r.text)).toEqual(["On it."])),
  ],
});
