import { Blueprint } from "orthograph";
import { Ticket } from "../thing.ts";
import { itsMain } from "@orthograph/superagent/blueprint/things/superagent/roles.ts";

export default Blueprint.operation(Ticket, {
  description: "Send a failed input again.",
  payload: {
    superagent: Ticket.fields.superagent,
    ticket: Ticket.fields.id,
  },
  answer: {},
  allowed: [Blueprint.signedIn, itsMain.of("superagent")],
});
