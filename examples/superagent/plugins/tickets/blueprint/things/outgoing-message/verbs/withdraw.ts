import { Blueprint } from "orthograph";
import { OutgoingMessage } from "../thing.ts";
import { machine } from "../machine.ts";
import { TicketEnded } from "../../ticket/events.ts";

export default Blueprint.operation(OutgoingMessage, {
  description: "Drop a ticket's pending replies: it ended, or its superagent retired.",
  payload: {
    ticket: OutgoingMessage.fields.ticket,
  },
  answer: {
    message: OutgoingMessage.fields.id,
  },
  move: machine.moves.withdrawn,
  allowed: [Blueprint.system],
  on: [Blueprint.on(TicketEnded, (e) => ({ ticket: e.ticket }))],
});
