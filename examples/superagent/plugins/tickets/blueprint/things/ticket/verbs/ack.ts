import { Blueprint } from "orthograph";
import { Ticket } from "../thing.ts";
import { itsAgent } from "../roles.ts";
import { OutgoingMessage } from "../../outgoing-message/thing.ts";

export default Blueprint.operation(Ticket, {
  description: "The executor acknowledges the message it was woken by, once, in one short reply.",
  payload: { ticket: Ticket.fields.id, trigger: Blueprint.text({ max: 120 }), text: Blueprint.text({ max: 65536 }) },
  answer: {  },
  allowed: [itsAgent],
  steps: { write: Blueprint.step.database({ writes: [OutgoingMessage, Ticket] }) },
});
