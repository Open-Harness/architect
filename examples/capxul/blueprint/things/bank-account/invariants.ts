import { Blueprint } from "orthograph";
import { BankAccount } from "./thing.ts";
import { machine } from "./machine.ts";
import { BankAccountNameTaken } from "./errors.ts";

// ERPNext names a Bank Account by its account name and bank. Every Capxul account is at Bridge's bank, so here one
// company has one open account by a name. A closed account frees its name.
export const oneNamePerCompany = Blueprint.invariant.unique([BankAccount.fields.company, BankAccount.fields.accountName], {
  while: [machine.states.open],
  refuse: BankAccountNameTaken,
});

// Bridge routes a deposit by its details, so no two accounts, open or closed, share them. It names no refusal: a clash
// is the handler's bug, not the caller's.
export const oneAccountPerDetails = Blueprint.invariant.unique([BankAccount.fields.routingNumber, BankAccount.fields.accountNumber]);
