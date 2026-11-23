import { Blueprint } from "orthograph";
import { Ticket } from "../ticket/thing.ts";

export const Subscription = Blueprint.thing({
  description: "A ticket following one thread: its own, one attached, one for context, or one it is bound to.",
  fields: {
    id: Blueprint.id("sub"),
    superagent: Blueprint.id("sag"),
    ticket: Ticket.fields.id,
    thread: Blueprint.text({ max: 200 }),
    mode: Blueprint.oneOf(["own", "attached", "context", "bound"]),
  },
  code: "SB",
});
