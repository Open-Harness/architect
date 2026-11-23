// Journey-author file (Goal 17 slice 10): Slack's door through the stand-in, which signs as Slack does with the adapter's test secret.
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
    s.step("Slack retries it: seen", slack.deliver({ event: "message", of: { ts: s.world.ts }, again: true }), expect((a) => a.status).toBe(200), noEvents()),
    s.step("signed with another secret: refused", slack.deliver({ event: "message", of: { ts: s.world.ts }, signed: "wrongly" }), expect((a) => a.status).toBe(401)),
    s.step("signed ten minutes ago: refused", slack.deliver({ event: "message", of: { ts: s.world.ts }, signed: "late" }), expect((a) => a.status).toBe(401)),
    s.step("one trigger in all", outbox.rows({ name: "TriggerReceived" }), expect((a) => a.rows.length).toBe(1)),
  ],
});
