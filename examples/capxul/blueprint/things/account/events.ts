import { Blueprint } from "orthograph";
import { Account } from "./thing.ts";

export const AccountCreated = Blueprint.event({
  account: Account.fields.id,
  company: Account.fields.company,
  rootType: Account.fields.rootType,
});
export const AccountMadeLedger = Blueprint.event({ account: Account.fields.id });
