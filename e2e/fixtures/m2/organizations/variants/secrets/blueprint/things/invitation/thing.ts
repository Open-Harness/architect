import { Blueprint } from "orthograph";
// The code is given, so the plugin can be mounted under any name (`team-members.ts`) without its things sharing a prefix.
import { Organization } from "../organization/thing.js";

export const Invitation = Blueprint.thing({
  description: "An offer to join an organisation, sent to an email address.",
  fields: { id: Blueprint.id("inv"), organization: Organization.fields.id, email: Blueprint.email(), invitedBy: Blueprint.id("per") },
  code: "IN",
});
