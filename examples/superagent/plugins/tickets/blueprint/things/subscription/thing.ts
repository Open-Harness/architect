import { Blueprint } from "orthograph";
import { Ticket } from "../ticket/thing.ts";
import { Superagent } from "@orthograph/superagent/blueprint/things/superagent/thing.ts";

export const Subscription = Blueprint.thing({
  description: "A ticket following one thread: its own, one attached, one for context, or one it is bound to.",
  fields: {
    id: Blueprint.id("sub"),
    superagent: Superagent.fields.id,
    ticket: Ticket.fields.id,
    thread: Blueprint.text({ max: 200 }),
    mode: Blueprint.oneOf(["own", "attached", "context", "bound"]),
  },
  code: "SB",
});
