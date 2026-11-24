// Journey-author file (Goal 17 slice 10). The builder of the doors never edits it. It uses the instruments GOAL17-check-harness
// fixes (call 6, "Slice 10, connections"): `github.comment` and `github.deliver`, `s.clock`, `outbox.rows`, `spans`. Red until slice 11
// builds the GitHub stand-in's commands and slice 9 the clock and the outbox's rows.
// A deliver with no `of` sends the event of what the stand-in made last, and `again: true` re-sends its last delivery as it was
// (GOAL17-deliver-last): a journey cannot keep an answer past the next step, and no world gives what the journey makes (#933).
import { Blueprint, emits, expect, noEvents, outbox, spans } from "orthograph";
import { github } from "@orthograph/github/stand";
import { TriggerReceived } from "@orthograph/intake/blueprint/things/trigger/events.ts";

export default Blueprint.journey("a webhook and a catch-up poll of one comment make one trigger", {
  cast: { ann: Blueprint.signedIn },
  starts: "a-live-superagent-listening-to-acme-widgets",
  steps: (s) => [
    s.step("ann comments on issue 12", github.comment({ repo: "acme/widgets", issue: 12, as: "ann", body: "@agent fix the flaky login test" }), expect((a) => a.id > 0).toBe(true)),
    s.step("GitHub sends the webhook", github.deliver({ event: "issue_comment", of: { comment: s.last.id } }), expect((a) => a.status).toBe(200)),
    s.step("the world settles: one trigger, from ann's account", s.clock.settle(), spans({ present: ["account.seen"] }), emits(TriggerReceived, { thread: "issue/12" })),
    s.step("the poll finds the same comment five minutes later and makes nothing new", s.clock.advance("5 minutes"), noEvents()),
    s.step("still one trigger", outbox.rows({ name: "TriggerReceived" }), expect((a) => a.rows.length).toBe(1)),
    s.step("the same webhook again changes nothing", github.deliver({ event: "issue_comment", again: true }), expect((a) => a.status).toBe(200), noEvents()),
    s.step("a webhook signed with another secret is refused", github.deliver({ event: "issue_comment", signed: "wrongly" }), expect((a) => a.status).toBe(401)),
    s.step("nothing was written for it", outbox.rows({ name: "TriggerReceived" }), expect((a) => a.rows.length).toBe(1)),
  ],
});
