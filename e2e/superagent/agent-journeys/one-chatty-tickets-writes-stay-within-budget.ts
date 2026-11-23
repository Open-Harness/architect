// Slice 8: "one chatty ticket's writes, which all bump one `seq`, stay within budget". GOAL17-check-harness, call 3's table: eight writes to one
// ticket at once. Counted: none lost or doubled (each write's one answer, each one fan-out), and no more lost races than N writers racing
// on one row can lose, N(N-1)/2 = 28. A row's `seq` is its event's journal position, so none of the counts reads one.
import { Blueprint, expect } from "orthograph";
import { models, outbox } from "../kit/doors.ts";
import { superagentResume, inputStore } from "../kit/ops.ts";
import { executorOf, turnSay } from "../kit/steps.ts";
import { SLACK_THREAD } from "../kit/consts.ts";

const N = 8;
const write = (s: { world: Record<string, unknown> }, n: number) => ({ superagent: s.world["superagent"], ticket: s.world["ticket"], thread: SLACK_THREAD, from: "person", text: `write ${n}` });

export default Blueprint.journey("one chatty ticket's writes stay within budget", {
  cast: { ann: Blueprint.signedIn, sys: Blueprint.system },
  starts: "a-paused-ticket",
  steps: (s) => [
    s.step("the executor's turn stays open at the model", models.script({ for: executorOf("ticket/one"), turns: [turnSay("Working.", "before-reply")] })),
    s.step("ann resumes the superagent", s.ann.run(superagentResume, { superagent: s.world.superagent })),
    s.step("the executor is running", s.clock.settle()),
    s.step("eight people write to the one ticket at the same instant", s.together(...Array.from({ length: N }, (_, n) => s.sys.run(inputStore, write(s, n)))),
      expect((a) => a.answers.length).toBe(N),
      expect((a) => new Set(a.answers.map((x: { input?: string }) => x.input)).size).toBe(N),
      expect((a) => a.answers.every((x: { input?: string }) => typeof x.input === "string")).toBe(true)),
    s.step("the world settles", s.clock.settle()),
    s.step("each write was stored once", outbox.rows({ name: "InputStored", afterSeq: "journey" }), expect((a) => a.rows.length).toBe(N)),
    s.step("each was routed to the running executor once, none doubled by a retried commit", outbox.rows({ name: "InputRouted", afterSeq: "journey" }),
      expect((a) => [a.rows.length, new Set(a.rows.map((r: { subject: string }) => r.subject)).size, a.rows.every((r: { state: string; attempts: number }) => r.state === "delivered" && r.attempts <= 1)]).toEqual([N, N, true])),
    s.step("no more lost races than eight writers can lose", outbox.mark({ since: "journey" }), expect((a) => a.conflicts <= (N * (N - 1)) / 2).toBe(true)),
  ],
});
