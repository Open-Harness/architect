import { Blueprint } from "orthograph";
import { Ticket } from "../thing.ts";
import { machine } from "../machine.ts";
import { Mandate } from "../../mandate/thing.ts";
import { Assignment } from "../../assignment/thing.ts";
import { itsMain } from "@orthograph/superagent/blueprint/things/superagent/roles.ts";

export default Blueprint.operation(Ticket, {
  description: "Stop a ticket: its mandate is withdrawn and its executor's turn closed.",
  payload: {
    superagent: Ticket.fields.superagent,
    ticket: Ticket.fields.id,
  },
  answer: {},
  move: machine.moves.stop,
  allowed: [Blueprint.signedIn, itsMain.of("superagent")],
  // One commit: the ticket stops, its mandate is withdrawn, and its executor's current assignment is cancelled or interrupted from the state it reads.
  steps: { write: Blueprint.step.database({ writes: [Ticket, Mandate, Assignment] }) },
});
