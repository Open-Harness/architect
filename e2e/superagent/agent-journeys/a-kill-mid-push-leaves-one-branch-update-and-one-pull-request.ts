// Slice 8: "a kill mid-push leaves one branch update and one pull request". GOAL17-check-harness call 2's example: GitHub's stand-in
// keeps the pull request's reply back after taking it, the runner is killed, and the same call runs again and finds its pull request.
// The sandbox is taken to be a clone of acme/widgets from the GitHub stand-in (no record says what prepares it: see the README).
import { Blueprint, expect } from "orthograph";
import { models, github, calls } from "../kit/doors.ts";
import type { ModelStep } from "../kit/doors.ts";
import { ticketAccept, listed } from "../kit/ops.ts";
import { acceptOf, executorOf, turnBash, turnSay } from "../kit/steps.ts";

const push = "git checkout -b fix-login && git commit --allow-empty -m 'Fix login' && git push origin fix-login";
const open = { call: [{ tool: "github.pulls.create", args: { head: "fix-login", base: "main", title: "Fix login" } }] };

export default Blueprint.journey("a kill mid-push leaves one branch update and one pull request", {
  cast: { gh: listed },
  starts: "an-executor-waits",
  steps: (s) => [
    s.step("the executor's turn is a push, then a pull request, then an answer", models.script({ for: executorOf("ticket/one"), turns: [turnBash(push), open, turnSay("Opened.")] })),
    s.step("GitHub keeps the pull request's reply back after taking it", github.hold({ match: { method: "POST", path: "/repos/acme/widgets/pulls" }, when: "after" })),
    s.step("a mention makes a ticket", s.gh.run(ticketAccept, acceptOf(s, { agent: s.world.executor }))),
    s.step("the world settles", s.clock.settle()),
    s.step("the pull request is made and its answer is unheard", github.held({ count: 1 }), expect((a) => a.held.length).toBe(1)),
    s.step("the runner is killed", s.runner.kill(), expect((a) => a.pid > 0).toBe(true)),
    s.step("and started again on the same state", s.runner.start()),
    s.step("GitHub answers at last", github.release({ hold: "all" })),
    s.step("the world settles: the same call ran again and found its pull request", s.clock.settle()),
    s.step("one update of the branch", github.refs({ branch: "fix-login" }), expect((a) => a.updates.length).toBe(1)),
    s.step("one pull request, on that branch", github.pulls({}), expect((a) => a.pulls.map((p: { head: string; state: string }) => [p.head, p.state])).toEqual([["fix-login", "open"]])),
    s.step("GitHub took the pull request's call twice: the one cut off, and the same call again, which found it", github.seen({ match: { method: "POST", path: "/repos/acme/widgets/pulls" } }), expect((a) => a.requests.length).toBe(2)),
    s.step("the Agent stored each round once", calls({ agent: s.world.executor }), expect((a) => a.steps.map((m: ModelStep) => m.round)).toEqual([1, 2, 3])),
    s.step("every scripted turn was used", models.done({}), expect((a) => a.unused).toBe(0)),
  ],
});
