// Journey-author file (Goal 17 slice 10): K40 fix 5, "catching up after sleep". A comment made while the world was down, which no
// webhook reached, is found by the poll once the world is back, once; and a webhook of it that arrives later changes nothing.
import { Blueprint, emits, expect, noEvents, outbox, spans } from "orthograph";
import { github } from "@orthograph/github/stand";
import { TriggerReceived } from "@orthograph/intake/blueprint/things/trigger/events.ts";

export default Blueprint.journey("a comment made while the world was down is found by the poll once", {
  cast: { ann: Blueprint.signedIn },
  starts: "a-live-superagent-listening-to-acme-widgets",
  steps: (s) => [
    s.step("the runner is killed", s.runner.kill(), expect((a) => a.pid > 0).toBe(true)),
    s.step("ann comments while it is down: nothing is sent", github.comment({ repo: "acme/widgets", issue: 12, as: "ann", body: "@agent fix the flaky login test" })),
    s.step("the runner starts again", s.runner.start()),
    s.step("the catch-up poll runs when the world starts, and finds it: one trigger from ann", s.clock.settle(), spans({ present: ["account.seen"] }), emits(TriggerReceived, { thread: "issue/12" })),
    s.step("the next poll finds it again and makes nothing", s.clock.advance("5 minutes"), noEvents()),
    s.step("GitHub's webhook of it arrives at last: seen", github.deliver({ event: "issue_comment", of: { comment: s.world.comment } }), expect((a) => a.status).toBe(200), noEvents()),
    s.step("one trigger in all", outbox.rows({ name: "TriggerReceived" }), expect((a) => a.rows.length).toBe(1)),
  ],
});
