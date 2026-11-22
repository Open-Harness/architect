import { Blueprint } from "orthograph";
import { Membership } from "./thing.js";

// The person the membership belongs to.
export const holder = Blueprint.role(Membership, { rule: (membership, principal) => membership.person === principal.person });
