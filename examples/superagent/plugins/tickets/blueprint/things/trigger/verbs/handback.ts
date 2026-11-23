import { Blueprint } from "orthograph";
import { Trigger } from "@orthograph/intake/blueprint/things/trigger/thing.ts";
import { Ticket } from "../../ticket/thing.ts";
import { itsAgent } from "../../ticket/roles.ts";

export default Blueprint.operation(Trigger, {
  description: "The executor hands a trigger back: it was not its to answer.",
  payload: {
    ticket: Ticket.fields.id,
    trigger: Trigger.fields.id,
  },
  answer: {},
  allowed: [itsAgent.of("ticket")],
});
