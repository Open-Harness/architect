import { Blueprint } from "orthograph";
import { Safe } from "./thing.ts";

export const PersonalSafeRecorded = Blueprint.event({ safe: Safe.fields.id, person: Safe.fields.person, account: Safe.fields.account });
export const CompanySafeRecorded = Blueprint.event({ safe: Safe.fields.id, company: Safe.fields.company, account: Safe.fields.account });
