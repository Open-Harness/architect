import { Blueprint } from "orthograph";
import { Ticket } from "../thing.ts";
import { PolicyChanged } from "@orthograph/intake/blueprint/things/policy/events.ts";

export default Blueprint.operation(Ticket, {
  description: "Tell the live tickets the policy changed under them.",
  payload: {
    superagent: Ticket.fields.superagent,
    revision: Blueprint.uint(32),
  },
  answer: {},
  allowed: [Blueprint.system],
  on: [Blueprint.on(PolicyChanged, (e) => ({ superagent: e.superagent, revision: e.revision }))],
});
