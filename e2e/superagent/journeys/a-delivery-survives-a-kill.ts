// Journey-author file (Goal 17 slice 10): a delivery the door accepted is not lost by a kill before it was delivered, and not
// doubled by the redelivery that follows (M5-reach-out Q3.2, Q5.1).
import { Blueprint, emits, expect, outbox } from "orthograph";
import { github } from "@orthograph/github/stand";
import { TriggerReceived } from "@orthograph/intake/blueprint/things/trigger/events.ts";

export default Blueprint.journey("a webhook accepted just before a kill makes one trigger", {
  cast: { ann: Blueprint.signedIn },
  starts: "a-live-superagent-listening-to-acme-widgets",
  steps: (s) => [
    s.step("ann comments on issue 12", github.comment({ repo: "acme/widgets", issue: 12, as: "ann", body: "@agent fix the flaky login test" })),
    s.step("GitHub sends the webhook, and the door takes it", github.deliver({ event: "issue_comment", of: { comment: s.last.id } }), expect((a) => a.status).toBe(200)),
    s.step("the runner is killed before anything is delivered", s.runner.kill()),
    s.step("and started again", s.runner.start()),
    s.step("the world settles: the trigger is made, once", s.clock.settle(), emits(TriggerReceived, { thread: "issue/12" })),
    s.step("GitHub, which saw no answer, sends it again: seen", github.deliver({ event: "issue_comment", of: { comment: s.world.comment }, again: true }), expect((a) => a.status).toBe(200)),
    s.step("one trigger in all, delivered", outbox.rows({ name: "TriggerReceived" }), expect((a) => a.rows.map((r: { state: string }) => r.state)).toEqual(["delivered"])),
  ],
});
