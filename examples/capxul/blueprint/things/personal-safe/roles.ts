import { Blueprint } from "orthograph";
import { PersonalSafe } from "./thing.ts";

/** The person whose Safe it is. Nobody else reads or claims it. */
export const holder = Blueprint.role(PersonalSafe, { rule: (safe, caller) => safe.person === caller.person });
