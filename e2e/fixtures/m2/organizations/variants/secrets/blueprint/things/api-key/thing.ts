import { Blueprint } from "orthograph";
// The code is given, so the plugin can be mounted under any name (`team-members.ts`) without its things sharing a prefix.
import { Organization } from "../organization/thing.js";

export const ApiKey = Blueprint.thing({
  description: "A key an agent or a service calls with, on behalf of whoever created it. Better Auth keeps its hash.",
  fields: { id: Blueprint.id("key"), organization: Organization.fields.id, name: Blueprint.text(), createdBy: Blueprint.id("per") },
  code: "AK",
});
