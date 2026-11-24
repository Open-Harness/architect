import { Blueprint } from "orthograph";
import { Amount } from "../../values/expenses.ts";

// Refusals that depend on data. The machine's own refusal is generated and never written here.
/** HRMS: "Sanctioned Amount cannot be greater than Claim Amount". The same amount is allowed. */
export class SanctionedOverClaimed extends Blueprint.error({ amount: Amount }, { exit: 41 }) {}
/** The expense type named belongs to another company. */
export class ExpenseTypeNotInCompany extends Blueprint.error({}, { exit: 42 }) {}
/** An expense goes only on a claim still in draft. */
export class ClaimNotDraft extends Blueprint.error({}, { exit: 43 }) {}
