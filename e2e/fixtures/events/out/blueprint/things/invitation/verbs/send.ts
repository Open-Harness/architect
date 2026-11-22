import { Blueprint } from "orthograph";
import { Invitation } from "../thing.ts";
import { machine } from "../machine.ts";
import { InvitationBlocked } from "../errors.ts";

export default Blueprint.operation(Invitation, {
  description: "Send an invitation to an address. The invitation is announced; the notifier delivers it.",
  payload: { email: Invitation.fields.email },
  answer: { invitation: Invitation.fields.id },
  move: machine.moves.send,
  errors: [InvitationBlocked],
  allowed: [Blueprint.anyone],
  steps: { insert: Blueprint.step.database() },
  budget: { p95: "150 millis" },
});
