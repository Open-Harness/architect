import { Blueprint } from "orthograph";
import { PersonalSafe } from "./thing.ts";

export const PersonalSafeOpened = Blueprint.event({ safe: PersonalSafe.fields.id, person: PersonalSafe.fields.person });
export const PersonalSafeClaimed = Blueprint.event({
  safe: PersonalSafe.fields.id,
  person: PersonalSafe.fields.person,
  signer: PersonalSafe.fields.signer,
  account: PersonalSafe.fields.account,
});
