import { Blueprint } from "orthograph";
import { Ticket } from "../thing.ts";
import { itsMain } from "@orthograph/superagent/blueprint/things/superagent/roles.ts";

export default Blueprint.operation(Ticket, {
  description: "Write a note on a ticket that does not wake its executor.",
  payload: {
    superagent: Ticket.fields.superagent,
    ticket: Ticket.fields.id,
    text: Blueprint.text({ max: 65536 }),
  },
  answer: {},
  allowed: [itsMain.of("superagent")],
});
