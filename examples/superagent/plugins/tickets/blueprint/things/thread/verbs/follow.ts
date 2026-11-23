import { Blueprint } from "orthograph";
import { Thread } from "@orthograph/intake/blueprint/things/thread/thing.ts";
import { Ticket } from "../../ticket/thing.ts";
import { itsAgent } from "../../ticket/roles.ts";
import { Subscription } from "../../subscription/thing.ts";

export default Blueprint.operation(Thread, {
  description: "The executor follows a thread: its next messages go straight to it, with no eval.",
  payload: { ticket: Ticket.fields.id, thread: Blueprint.text({ max: 200 }) },
  answer: {  },
  allowed: [itsAgent.of("ticket")],
  steps: { write: Blueprint.step.database({ writes: [Subscription] }) },
});
