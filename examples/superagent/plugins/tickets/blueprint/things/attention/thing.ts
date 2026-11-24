import { Blueprint } from "orthograph";
import { Ticket } from "../ticket/thing.ts";
import { Superagent } from "@orthograph/superagent/blueprint/things/superagent/thing.ts";

export const Attention = Blueprint.thing({
  description: "A question a person must answer, made by a report; a person's next message answers it.",
  fields: {
    id: Blueprint.id("att"),
    superagent: Superagent.fields.id,
    ticket: Ticket.fields.id,
    question: Blueprint.text({ max: 2000 }),
  },
  code: "AT",
});
