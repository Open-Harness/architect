import { Blueprint } from "orthograph";
import { Invitation } from "./thing.ts";
import { Email } from "../../values/people.ts";

export const InvitationSent = Blueprint.event({ invitation: Invitation.fields.id, email: Email });
