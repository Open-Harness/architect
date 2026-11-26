import { Blueprint } from "orthograph";
import { PersonalSafe } from "./thing.ts";

export const PersonalSafeOpened = Blueprint.event({ safe: PersonalSafe.fields.id, person: PersonalSafe.fields.person });
