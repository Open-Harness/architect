import { Blueprint } from "orthograph";
import { Invitation } from "./thing.js";
import { Membership } from "../membership/thing.js";

export const InvitationSent = Blueprint.event({ invitation: Invitation.fields.id, email: Invitation.fields.email });
export const InvitationAccepted = Blueprint.event({ invitation: Invitation.fields.id, membership: Membership.fields.id });
export const InvitationRevoked = Blueprint.event({ invitation: Invitation.fields.id });
