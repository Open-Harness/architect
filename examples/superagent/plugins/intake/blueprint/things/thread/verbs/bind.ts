import { Blueprint } from "orthograph";
import { Thread } from "../thing.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(Thread, {
  description: "Make the thread an event belongs to, once, for this superagent.",
  payload: { superagent: Thread.fields.superagent, source: Thread.fields.source, key: Thread.fields.key, channel: Thread.fields.channel },
  answer: { thread: Thread.fields.id },
  move: machine.moves.bind,
  allowed: [Blueprint.system],
});
