import { Blueprint } from "orthograph";
import { Organization } from "./thing.js";

// The person who created the organisation.
export const owner = Blueprint.role(Organization, { rule: (organization, principal) => organization.owner === principal.person });
