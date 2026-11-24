import { Blueprint } from "orthograph";
import { BankAccount } from "./thing.ts";

// Refusals that depend on data. The machine's own refusal is generated and never written here.
/** Bridge opens accounts only for a business it has approved. */
export class KybNotApproved extends Blueprint.error({}, { exit: 41 }) {}
/** The company already has an open account by that name. */
export class BankAccountNameTaken extends Blueprint.error({ accountName: BankAccount.fields.accountName }, { exit: 42 }) {}
