import { Blueprint } from "orthograph";
import { Ticket } from "../thing.ts";
import { itsMain } from "@orthograph/superagent/blueprint/things/superagent/roles.ts";

export default Blueprint.operation(Ticket, {
  description: "Attach another thread to a ticket.",
  payload: { superagent: Ticket.fields.superagent, ticket: Ticket.fields.id, thread: Blueprint.text({ max: 200 }) },
  answer: {  },
  allowed: [itsMain.of("superagent")],
});
