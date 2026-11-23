import { Blueprint } from "orthograph";
import { Ticket } from "../thing.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(Ticket, {
  description: "End a ticket: the reported work is ready, its threads are closed, or the playbook says so. Its executor stays, idle.",
  payload: {
    ticket: Ticket.fields.id,
  },
  answer: {},
  move: machine.moves.end,
  allowed: [Blueprint.system],
});
