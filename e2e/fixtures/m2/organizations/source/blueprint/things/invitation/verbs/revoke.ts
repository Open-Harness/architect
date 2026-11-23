import { Blueprint } from "orthograph";
import { Invitation } from "../thing.js";
import { machine } from "../machine.js";
import { owner } from "../../organization/roles.js";

export default Blueprint.operation(Invitation, {
  description: "Withdraw an invitation that hasn't been accepted.",
  payload: { invitation: Invitation.fields.id },
  answer: {},
  move: machine.moves.revoke,
  allowed: [owner.of("invitation.organization")],
  steps: { update: Blueprint.step.database() },
  budget: { p95: "150 millis" },
});
