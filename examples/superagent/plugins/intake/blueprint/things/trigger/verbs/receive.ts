import { Blueprint } from "orthograph";
import { Trigger } from "../thing.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(Trigger, {
  description: "Store one event a connection brought, once: a second delivery of the same event is a duplicate, and one the policy filters is not kept.",
  payload: { superagent: Trigger.fields.superagent, source: Trigger.fields.source, event: Trigger.fields.event, thread: Trigger.fields.thread, kind: Trigger.fields.kind, text: Trigger.fields.text, url: Trigger.fields.url, author: Trigger.fields.author, channel: Trigger.fields.channel },
  answer: { trigger: Trigger.fields.id, outcome: Blueprint.oneOf(["stored", "duplicate", "filtered"]) },
  move: machine.moves.receive,
  allowed: [Blueprint.system],
});
