import { Blueprint } from "orthograph";
import { Ticket } from "../ticket/thing.ts";

export const Attention = Blueprint.thing({
  description: "A question a person must answer, made by a report; a person's next message answers it.",
  fields: {
    id: Blueprint.id("att"),
    superagent: Blueprint.id("sag"),
    ticket: Ticket.fields.id,
    question: Blueprint.text({ max: 2000 }),
  },
  code: "AT",
});
