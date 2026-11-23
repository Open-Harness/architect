import { Blueprint } from "orthograph";
import { Ticket } from "../ticket/thing.ts";

export const Mandate = Blueprint.thing({
  description: "What a ticket may do, pinned to the policy version it was accepted under.",
  fields: {
    id: Blueprint.id("mnd"),
    superagent: Blueprint.id("sag"),
    ticket: Ticket.fields.id,
    account: Blueprint.id("acc"),
    policy: Blueprint.uint(32),
  },
  code: "MA",
});
