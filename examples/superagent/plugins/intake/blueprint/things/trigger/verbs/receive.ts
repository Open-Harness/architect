import { Blueprint, Schema } from "orthograph";
import { Trigger } from "../thing.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(Trigger, {
  description: "Store one event a connection brought, once: a second delivery of the same event is a duplicate, and one the policy filters is not kept.",
  payload: {
    superagent: Trigger.fields.superagent,
    source: Trigger.fields.source,
    event: Trigger.fields.event,
    thread: Trigger.fields.thread,
    kind: Trigger.fields.kind,
    text: Trigger.fields.text,
    url: Trigger.fields.url,
    addressed: Blueprint.optional(Blueprint.oneOf(["mention", "direct"])),
    // Who sent it: absent for no sender (a CI result, a PostHog alert). A stranger's details are kept only when the trigger is.
    actor: Blueprint.optional(Blueprint.value(Schema.Struct({ id: Schema.String, name: Schema.String, bot: Schema.Boolean }))),
    channel: Trigger.fields.channel,
  },
  answer: {
    // Absent when the gate filtered the event: nothing was kept.
    trigger: Blueprint.optional(Blueprint.id("trg")),
    outcome: Blueprint.oneOf(["stored", "duplicate", "filtered"]),
  },
  move: machine.moves.receive,
  allowed: [Blueprint.system],
});
