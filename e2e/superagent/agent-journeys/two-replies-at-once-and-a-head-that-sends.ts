// Slice 8: "two replies at once and a head that sends at that moment leave one head and no lost reply". GOAL17-check-harness, call 3's
// table. The conversation's head (the acknowledgement) is mid-send at Slack when two replies are made at once; all three come out, once,
// in order, and only the head ever has an outbox row. The callers are the main agent twice: the blueprint allows `outgoing-message.reply`
// to the main agent and the system only (the executor replies through `ticket.ack`), so "main and executor" is main and main here.
import { Blueprint, emits, expect } from "orthograph";
import { models, slack, outbox } from "../kit/doors.ts";
import type { Row } from "../kit/doors.ts";
import { AssignmentStarted, ReplyQueued, SuperagentResumed, outgoingMessageReply, superagentResume, itsMain } from "../kit/ops.ts";
import { executorOf, turnSay } from "../kit/steps.ts";
import { CHANNEL, SLACK_TS } from "../kit/consts.ts";

const update = (s: { world: Record<string, unknown> }, text: string) => ({ superagent: s.world["superagent"], ticket: s.world["ticket"], conversation: "ticket", purpose: "update", text });

export default Blueprint.journey("two replies at once and a head that sends at that moment leave one head and no lost reply", {
  cast: { ann: Blueprint.signedIn, main: itsMain },
  starts: "a-paused-ticket",
  steps: (s) => [
    s.step("Slack keeps every post back before taking it", slack.hold({ match: { method: "POST", path: "/api/chat.postMessage" }, when: "before" })),
    s.step("the executor answers", models.script({ for: executorOf("ticket/one"), turns: [turnSay("Looking.")] })),
    s.step("ann resumes the superagent", s.ann.run(superagentResume, { superagent: s.world.superagent }), emits(SuperagentResumed, {})),
    s.step("the world settles: the acknowledgement is the head, and it is mid-send", s.clock.settle(), emits(AssignmentStarted, { agent: s.world.executor })),
    s.step("Slack holds exactly the head's post", slack.held({ count: 1 }), expect((a) => a.held.length).toBe(1)),
    s.step("the main agent makes two replies at the same instant", s.together(s.main.run(outgoingMessageReply, update(s, "one")), s.main.run(outgoingMessageReply, update(s, "two"))),
      expect((a) => a.answers.length).toBe(2), expect((a) => a.answers.every((x: { message?: string }) => typeof x.message === "string")).toBe(true),
      expect((a) => new Set(a.answers.map((x: { message: string }) => x.message)).size).toBe(2)),
    s.step("one head: the sending acknowledgement is the only row there is, and it is claimed", outbox.rows({ name: "ReplyQueued", afterSeq: "journey" }),
      expect((a) => [a.rows.length, a.rows[0]?.state]).toEqual([1, "claimed"])),
    s.step("Slack answers at last", slack.release({ hold: "all" })),
    s.step("the world settles: the head sent, then each next head", s.clock.settle(), emits(ReplyQueued, {})),
    s.step("the thread holds each text once: the acknowledgement first, then the two in either order",
      slack.replies({ channel: CHANNEL, thread: SLACK_TS }),
      expect((a) => [a.replies[0].text, a.replies.slice(1).map((r: { text: string }) => r.text).sort(), a.replies.length]).toEqual(["On it.", ["one", "two"], 3]),
      expect((a) => a.replies.map((r: { n: number }) => r.n)).toEqual([1, 2, 3])),
    s.step("every reply row is done, and there are three", outbox.rows({ name: "ReplyQueued", afterSeq: "journey" }),
      expect((a) => [a.rows.length, a.rows.every((r: Row) => r.state === "delivered")]).toEqual([3, true])),
  ],
});
