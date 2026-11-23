import { Blueprint } from "orthograph";
import { BankAccount } from "./thing.ts";
import { machine } from "./machine.ts";
import { BankAccountNameTaken } from "./errors.ts";

// ERPNext names a Bank Account by its account name and bank, so one company has one open account by a name. A closed
// account frees its name.
export const oneNamePerCompany = Blueprint.invariant.unique([BankAccount.fields.company, BankAccount.fields.accountName], {
  while: [machine.states.open],
  refuse: BankAccountNameTaken,
});
