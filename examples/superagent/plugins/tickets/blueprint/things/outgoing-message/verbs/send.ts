import { Blueprint } from "orthograph";
import { OutgoingMessage } from "../thing.ts";
import { machine } from "../machine.ts";
import { ReplyQueued } from "../events.ts";

export default Blueprint.operation(OutgoingMessage, {
  description: "Send a conversation's head through its connection. A failed call is counted and queued again; the outbox always sees a success.",
  payload: { message: OutgoingMessage.fields.id },
  answer: { sent: Blueprint.bool() },
  move: machine.moves.settled,
  allowed: [Blueprint.system],
  on: [Blueprint.on(ReplyQueued, (e) => ({ message: e.message }))],
});
