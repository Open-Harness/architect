import { Blueprint } from "orthograph";
import { Ticket } from "../thing.ts";
import { itsAgent } from "../roles.ts";
import { Report } from "../../report/thing.ts";

export default Blueprint.operation(Ticket, {
  description: "The executor says how the work stands: progress, waiting, ready, blocked, failed or dropped.",
  payload: {
    ticket: Ticket.fields.id,
    kind: Blueprint.oneOf(["progress", "waiting", "ready", "blocked", "failed", "dropped"]),
    text: Blueprint.text({ max: 65536 }),
  },
  answer: {},
  allowed: [itsAgent],
  steps: { write: Blueprint.step.database({ writes: [Report, Ticket] }) },
});
