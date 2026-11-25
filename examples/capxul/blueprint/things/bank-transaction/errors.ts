import { Blueprint } from "orthograph";
import { BankTransaction } from "./thing.ts";

// Refusals that depend on data. The machine's own refusal is generated and never written here.
/** The bank account is closed: Bridge has deactivated it, so nothing is sent from it. */
export class AccountClosed extends Blueprint.error({ account: BankTransaction.fields.account }, { exit: 41 }) {}
/** The bank account doesn't hold that currency: each Bridge virtual account takes one. */
export class CurrencyNotHeld extends Blueprint.error({ currency: BankTransaction.fields.currency }, { exit: 42 }) {}
/** A transfer moves more than nothing. */
export class NothingToSend extends Blueprint.error({}, { exit: 43 }) {}
/** Bridge already reported this movement, and it is recorded once. */
export class AlreadyRecorded extends Blueprint.error({ reference: BankTransaction.fields.reference }, { exit: 44 }) {}
