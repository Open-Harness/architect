import { Blueprint } from "orthograph";
// The code is given, so the plugin can be mounted under any name (`team-members.ts`) without its things sharing a prefix.
import { Organization } from "../organization/thing.js";
import { Role } from "../../values/role.js";

export const Membership = Blueprint.thing({
  description: "A person's place in an organisation.",
  fields: { id: Blueprint.id("mem"), organization: Organization.fields.id, person: Blueprint.id("per"), role: Role },
  code: "ME",
});
