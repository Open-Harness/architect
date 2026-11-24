// Slice 8: "a failed send is retried after a restart". GOAL17-derived-reads: a failed call is counted on the message and queued again
// after 5 s doubling to 300 s through `Timers`, and the outbox sees a success; the world's once-a-minute backstop (`superagent.boot`)
// arms the retry again after a restart.
import { Blueprint, expect } from "orthograph";
import { models, slack, outbox } from "../kit/doors.ts";
import type { Row } from "../kit/doors.ts";
import { ticketAccept, listed } from "../kit/ops.ts";
import { acceptOf, executorOf, turnSay } from "../kit/steps.ts";
import { CHANNEL, SLACK_TS, SLACK_THREAD } from "../kit/consts.ts";

export default Blueprint.journey("a failed send is retried after a restart", {
  cast: { gh: listed },
  starts: "an-executor-waits",
  steps: (s) => [
    s.step("Slack's first post fails with a 500", slack.fail({ match: { method: "POST", path: "/api/chat.postMessage" }, with: { status: 500 }, times: 1 })),
    s.step("the executor answers", models.script({ for: executorOf("ticket/one"), turns: [turnSay("Looking.")] })),
    s.step("a mention in a Slack thread makes a ticket, and its acknowledgement is queued", s.gh.run(ticketAccept, acceptOf(s, { agent: s.world.executor, thread: SLACK_THREAD, text: "<@U0BOT0001> fix the flaky login test" }))),
    s.step("the world settles: the send was tried and failed", s.clock.settle()),
    s.step("Slack saw exactly one post before the restart, which it failed", slack.seen({ match: { method: "POST", path: "/api/chat.postMessage" } }), expect((a) => a.requests.length).toBe(1)),
    s.step("nothing reached the thread", slack.replies({ channel: CHANNEL, thread: SLACK_TS }), expect((a) => a.replies.length).toBe(0)),
    s.step("the outbox saw a success: the retry is the app's, not the outbox's", outbox.rows({ name: "ReplyQueued", afterSeq: "journey" }),
      expect((a) => a.rows.map((r: Row) => r.state)).toEqual(["delivered"])),
    s.step("the runner is killed and started again", s.runner.restart()),
    s.step("a minute passes: the backstop arms the retry and its wait has passed", s.clock.advance("1 minute")),
    s.step("the acknowledgement is in the thread exactly once, keyed by what it answers", slack.replies({ channel: CHANNEL, thread: SLACK_TS }),
      expect((a) => a.replies.map((r: { text: string; key: string | null }) => [r.text, r.key !== null])).toEqual([["On it.", true]])),
    s.step("no second row was written for the retry", outbox.rows({ name: "ReplyQueued", afterSeq: "journey" }), expect((a) => a.rows.length).toBe(1)),
    s.step("Slack saw two posts in all: the one that failed and the retry", slack.seen({ match: { method: "POST", path: "/api/chat.postMessage" } }), expect((a) => a.requests.length).toBe(2)),
  ],
});
