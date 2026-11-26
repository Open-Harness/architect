import { Blueprint } from "orthograph";
import { PersonalSafe } from "./thing.ts";
import { SafeAlreadyOpen } from "./errors.ts";

// One Safe per person.
export const oneSafePerPerson = Blueprint.invariant.unique(PersonalSafe.fields.person, { refuse: SafeAlreadyOpen });
