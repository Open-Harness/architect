import { Blueprint } from "orthograph";
import { Ticket } from "../ticket/thing.ts";
import { Superagent } from "@orthograph/superagent/blueprint/things/superagent/thing.ts";

export const OutgoingMessage = Blueprint.thing({
  description: "One reply to a person, kept until it is sent: in order, the head of its conversation first.",
  fields: {
    id: Blueprint.id("msg"),
    superagent: Superagent.fields.id,
    ticket: Ticket.fields.id,
    conversation: Blueprint.text({ max: 200 }),
    purpose: Blueprint.text({ max: 40 }),
    text: Blueprint.text({ max: 65536 }),
    failures: Blueprint.uint(32),
    notBefore: Blueprint.uint(64),
  },
  code: "OU",
});
