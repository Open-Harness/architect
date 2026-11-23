import { Blueprint } from "orthograph";
import { Link } from "./thing.ts";

// The person whose page the link is on.
export const linkOwner = Blueprint.role(Link, { rule: (link, caller) => link.owner === caller.person });
