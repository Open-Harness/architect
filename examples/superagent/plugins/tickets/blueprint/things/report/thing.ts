import { Blueprint } from "orthograph";
import { Ticket } from "../ticket/thing.ts";
import { Superagent } from "@orthograph/superagent/blueprint/things/superagent/thing.ts";

export const Report = Blueprint.thing({
  description: "How the executor says a ticket stands. Its state is its kind.",
  fields: {
    id: Blueprint.id("rpt"),
    superagent: Superagent.fields.id,
    ticket: Ticket.fields.id,
    text: Blueprint.text({ max: 65536 }),
    seq: Blueprint.uint(64),
  },
  code: "RE",
});
