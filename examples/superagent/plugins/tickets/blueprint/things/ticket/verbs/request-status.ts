import { Blueprint } from "orthograph";
import { Ticket } from "../thing.ts";
import { itsMain } from "@orthograph/superagent/blueprint/things/superagent/roles.ts";

export default Blueprint.operation(Ticket, {
  description: "Ask a ticket's executor where it stands; a person's request may use the seat kept for a person.",
  payload: { superagent: Ticket.fields.superagent, ticket: Ticket.fields.id },
  answer: {  },
  allowed: [Blueprint.signedIn, itsMain.of("superagent")],
});
