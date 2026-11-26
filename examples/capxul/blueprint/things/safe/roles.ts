import { Blueprint } from "orthograph";
import { Safe } from "./thing.ts";

/** The person whose own Safe it is. A company's Safe has no person, so this admits nobody there. */
export const holder = Blueprint.role(Safe, { rule: (safe, caller) => safe.person !== undefined && safe.person === caller.person });
