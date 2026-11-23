import { Blueprint } from "orthograph";
import { Ticket } from "../thing.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(Ticket, {
  description: "Wake an ended ticket on a person's message, after its mandate is revalidated: the same executor, with its memory.",
  payload: { ticket: Ticket.fields.id },
  answer: {  },
  move: machine.moves.resume,
  allowed: [Blueprint.system],
});
