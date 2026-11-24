import { Blueprint } from "orthograph";
import { Mandate } from "../thing.ts";
import { machine } from "../machine.ts";
import { TicketResumed } from "../../ticket/events.ts";

export default Blueprint.operation(Mandate, {
  description: "Check a ticket's mandate against the policy as it is now, before the ticket resumes.",
  payload: {
    ticket: Mandate.fields.ticket,
  },
  answer: {
    mandate: Mandate.fields.id,
  },
  move: machine.moves.revalidate,
  allowed: [Blueprint.system],
  on: [Blueprint.on(TicketResumed, (e) => ({ ticket: e.ticket }))],
});
