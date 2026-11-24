// Journey-author file (Goal 17 slice 10): Slack's door through the stand-in, which signs as Slack does with the adapter's test secret.
// A deliver with no `of` sends the event of what the stand-in made last, and `again: true` re-sends its last delivery as it was
// (GOAL17-deliver-last): a journey cannot keep an answer past the next step, and no world gives what the journey makes (#933).
import { Blueprint, emits, expect, noEvents, outbox, spans } from "orthograph";
import { slack } from "@orthograph/slack/stand";
import { TriggerReceived } from "@orthograph/intake/blueprint/things/trigger/events.ts";

export default Blueprint.journey("a message in a listened channel makes one trigger, and a bad signature none", {
  cast: { ann: Blueprint.signedIn },
  starts: "a-live-superagent-listening-to-acme-widgets",
  steps: (s) => [
    s.step("ann says it in #eng", slack.say({ channel: "C024BE91L", as: "ann", text: "@agent fix the flaky login test" }), expect((a) => typeof a.ts).toBe("string")),
    s.step("Slack sends the event", slack.deliver({ event: "message", of: { ts: s.last.ts } }), expect((a) => a.status).toBe(200)),
    s.step("the world settles: one trigger, from ann's account", s.clock.settle(), spans({ present: ["account.seen"] }), emits(TriggerReceived, {})),
    s.step("Slack retries it: seen", slack.deliver({ event: "message", again: true }), expect((a) => a.status).toBe(200), noEvents()),
    s.step("signed with another secret: refused", slack.deliver({ event: "message", signed: "wrongly" }), expect((a) => a.status).toBe(401)),
    s.step("signed ten minutes ago: refused", slack.deliver({ event: "message", signed: "late" }), expect((a) => a.status).toBe(401)),
    s.step("one trigger in all", outbox.rows({ name: "TriggerReceived" }), expect((a) => a.rows.length).toBe(1)),
  ],
});
