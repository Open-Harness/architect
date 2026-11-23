import { Blueprint } from "orthograph";
import { Ticket } from "../ticket/thing.ts";

export const Input = Blueprint.thing({
  description: "One message for a ticket's executor, waiting for a seat, routed, delivered or failed.",
  fields: {
    id: Blueprint.id("inp"),
    superagent: Blueprint.id("sag"),
    ticket: Ticket.fields.id,
    from: Blueprint.oneOf(["person", "trigger", "system"]),
    text: Blueprint.text({ max: 65536 }),
    seq: Blueprint.uint(64),
    retryAt: Blueprint.uint(64),
    refusals: Blueprint.uint(32),
  },
  code: "IN",
});
