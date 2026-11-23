import { Blueprint } from "orthograph";
import { Organization } from "./thing.js";

export const OrganizationCreated = Blueprint.event({ organization: Organization.fields.id, owner: Organization.fields.owner });
