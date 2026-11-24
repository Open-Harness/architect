import { Blueprint } from "orthograph";
import { OutgoingMessage } from "../thing.ts";
import { machine } from "../machine.ts";
import { itsMain } from "@orthograph/superagent/blueprint/things/superagent/roles.ts";
import { TicketCreated } from "../../ticket/events.ts";

export default Blueprint.operation(OutgoingMessage, {
  description: "Queue a reply: by purpose, in order within its conversation. Only the head of a conversation has an outbox row.",
  payload: {
    superagent: OutgoingMessage.fields.superagent,
    ticket: OutgoingMessage.fields.ticket,
    conversation: OutgoingMessage.fields.conversation,
    purpose: OutgoingMessage.fields.purpose,
    text: OutgoingMessage.fields.text,
  },
  answer: {
    message: OutgoingMessage.fields.id,
  },
  move: machine.moves.queued,
  allowed: [itsMain.of("superagent"), Blueprint.system],
  on: [Blueprint.on(TicketCreated, (e) => ({ superagent: e.superagent, ticket: e.ticket, conversation: "ticket", purpose: "acknowledgement", text: "On it." }))],
});
