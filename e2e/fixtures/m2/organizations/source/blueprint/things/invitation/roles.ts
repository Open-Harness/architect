import { Blueprint } from "orthograph";
import { Invitation } from "./thing.js";

// Whoever signed in with the address the invitation was sent to.
export const invitee = Blueprint.role(Invitation, { rule: (invitation, principal) => invitation.email === principal.email });
