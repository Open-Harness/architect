import { Blueprint } from "orthograph";
import { Invitation } from "../thing.js";
import { machine } from "../machine.js";
import { owner } from "../../organization/roles.js";

export default Blueprint.operation(Invitation, {
  description: "Invite someone to an organisation by email.",
  payload: { organization: Invitation.fields.organization, email: Invitation.fields.email },
  answer: { invitation: Invitation.fields.id },
  move: machine.moves.send,
  allowed: [owner.of("organization")],
  steps: { insert: Blueprint.step.database() },
  budget: { p95: "200 millis" },
});
