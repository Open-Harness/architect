import { Blueprint, Via } from "orthograph";
import { Invitation } from "../thing.ts";
import { machine } from "../machine.ts";
import { invitee } from "../roles.ts";
import { Membership } from "../../membership/thing.ts";

export default Blueprint.operation(Invitation, {
  description: "Accept an invitation and become a member of its organisation.",
  payload: { invitation: Invitation.fields.id },
  answer: { organization: Invitation.fields.organization, membership: Membership.fields.id },
  move: machine.moves.accept,
  // An agent cannot consent for a person (M2.03, `.notVia` keeps session, key and device).
  allowed: [invitee.notVia(Via.agent)],
  steps: { join: Blueprint.step.database() },
  budget: { p95: "200 millis" },
});
