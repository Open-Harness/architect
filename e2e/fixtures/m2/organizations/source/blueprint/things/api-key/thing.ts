import { Blueprint } from "orthograph";
import { Organization } from "../organization/thing.js";

export const ApiKey = Blueprint.thing({
  description: "A key an agent or a service calls with, on behalf of whoever created it. Better Auth keeps its hash.",
  fields: { id: Blueprint.id("key"), organization: Organization.fields.id, name: Blueprint.text(), createdBy: Blueprint.id("per") },
});
