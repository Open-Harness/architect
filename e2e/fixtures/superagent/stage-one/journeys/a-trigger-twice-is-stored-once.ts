// Checks-author file (Goal 17, slice 6). A builder never edits it.
// The brief's "a trigger twice stored once": `trigger.receive` is idempotent by source and event. A webhook delivered twice, or
// a webhook and a poll of one comment, reach it as one event with one id.
import { Blueprint, emits, expect, noEvents } from "orthograph";
import { machine } from "@orthograph/intake/blueprint/things/trigger/machine.ts";
import { TriggerReceived } from "@orthograph/intake/blueprint/things/trigger/events.ts";
import receive from "@orthograph/intake/blueprint/things/trigger/verbs/receive.ts";

export default Blueprint.journey("a trigger twice is stored once", {
  cast: { source: Blueprint.system },
  starts: "a-trigger-was-received",
  steps: (s) => [
    s.step(
      "the first event delivered again is the first trigger, and nothing is recorded",
      s.source.run(receive, { superagent: s.world.superagent, source: "slack", event: "Ev1", thread: "C1:1.1", kind: "mention", text: "@agent fix the flaky login test", actor: { id: "U1", name: "ann", bot: false }, addressed: "mention", channel: { channel: "C1", ts: "1.1" } }),
      expect((a) => a.outcome).toBe("duplicate"),
      expect((a) => a.trigger).toBe(s.world.trigger),
      noEvents(),
      machine.isIn(s.world.trigger, "stored"),
    ),
    s.step(
      "the same event delivered again, with its text changed, is still the first trigger",
      s.source.run(receive, { superagent: s.world.superagent, source: "slack", event: "Ev1", thread: "C1:1.1", kind: "mention", text: "@agent fix the flaky login test (edited)", actor: { id: "U1", name: "ann", bot: false }, addressed: "mention", channel: { channel: "C1", ts: "1.1" } }),
      expect((a) => a.outcome).toBe("duplicate"),
      expect((a) => a.trigger).toBe(s.world.trigger),
      noEvents(),
    ),
    s.step(
      "another event on the same thread is stored as a trigger of its own",
      s.source.run(receive, { superagent: s.world.superagent, source: "slack", event: "Ev2", thread: "C1:1.1", kind: "mention", text: "@agent and the signup test too", actor: { id: "U1", name: "ann", bot: false }, addressed: "mention", channel: { channel: "C1", ts: "1.1" } }),
      expect((a) => a.outcome).toBe("stored"),
      expect((a) => a.trigger).toMatch(/^trg_[0-9a-z]+$/),
      emits(TriggerReceived, { superagent: s.world.superagent, trigger: s.last.trigger, thread: "C1:1.1", text: "@agent and the signup test too" }),
      machine.isIn(s.last.trigger, "stored"),
    ),
    s.step(
      "the first event is still the first trigger after that",
      s.source.run(receive, { superagent: s.world.superagent, source: "slack", event: "Ev1", thread: "C1:1.1", kind: "mention", text: "@agent fix the flaky login test", actor: { id: "U1", name: "ann", bot: false }, addressed: "mention", channel: { channel: "C1", ts: "1.1" } }),
      expect((a) => a.outcome).toBe("duplicate"),
      expect((a) => a.trigger).toBe(s.world.trigger),
      noEvents(),
    ),
  ],
});
