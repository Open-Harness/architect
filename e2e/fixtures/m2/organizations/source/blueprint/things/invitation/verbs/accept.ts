import { Blueprint } from "orthograph";
import { Invitation } from "../thing.js";
import { machine } from "../machine.js";
import { invitee } from "../roles.js";
import { Membership } from "../../membership/thing.js";

export default Blueprint.operation(Invitation, {
  description: "Accept an invitation and become a member of its organisation.",
  payload: { invitation: Invitation.fields.id },
  answer: { organization: Invitation.fields.organization, membership: Membership.fields.id },
  move: machine.moves.accept,
  allowed: [invitee],
  steps: { join: Blueprint.step.database() },
  budget: { p95: "200 millis" },
});
