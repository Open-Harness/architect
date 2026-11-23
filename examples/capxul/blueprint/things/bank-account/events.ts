import { Blueprint } from "orthograph";
import { BankAccount } from "./thing.ts";

export const BankAccountOpened = Blueprint.event({
  account: BankAccount.fields.id,
  company: BankAccount.fields.company,
  business: BankAccount.fields.business,
  currency: BankAccount.fields.currency,
});
export const BankAccountClosed = Blueprint.event({ account: BankAccount.fields.id });
