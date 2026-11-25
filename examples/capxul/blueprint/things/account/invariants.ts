import { Blueprint } from "orthograph";
import { Account } from "./thing.ts";
import { AccountNameTaken } from "./errors.ts";

// ERPNext's `autoname`: an account is named `<account_name> - <company abbr>`, so one company has one of each name.
// Account numbers, which ERPNext puts before the name, come later.
export const oneNamePerCompany = Blueprint.invariant.unique([Account.fields.company, Account.fields.accountName], {
  refuse: AccountNameTaken,
});
