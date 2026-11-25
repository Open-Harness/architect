import { Blueprint } from "orthograph";
import { Day } from "../../values/employee.ts";
import { Balance, LineNumber } from "../../values/ledger.ts";

// Refusals that depend on data. The machine's own refusal is generated and never written here.
// `journal-entry.create` judges in this order (ERPNext's `validate`: `validate_account_company` over the rows, then
// `validate_debit_credit_amount`, then `set_total_debit_credit`): JournalEntryTooFewLines; then the four account and
// cost-center checks line by line (LineAccountNotInCompany, LineAccountIsGroup, LineCostCenterNotInCompany,
// LineCostCenterIsGroup on line 1, then the same four on line 2, and so on); then LineWithoutAmount over every line;
// then LineDebitAndCredit over every line. Each line refusal carries the first line, from 1, that breaks it.
// `journal-entry.submit` refuses JournalEntryUnbalanced (`before_submit`) before PostingDateOutsideFiscalYear (the GL
// Entry's `validate_and_set_fiscal_year`, on submit).
/**
 * Fewer than two lines. ERPNext refuses an empty table (`validate_empty_accounts_table`) and, on submit, a single
 * ledger line ("Incorrect number of General Ledger Entries"); Capxul refuses both on create.
 */
export class JournalEntryTooFewLines extends Blueprint.error({}, { exit: 41 }) {}
/** ERPNext's `validate_account_head`: "Account does not belong to Company". */
export class LineAccountNotInCompany extends Blueprint.error({ line: LineNumber }, { exit: 42 }) {}
/** ERPNext's `validate_account_head`: "Account is a Group Account". */
export class LineAccountIsGroup extends Blueprint.error({ line: LineNumber }, { exit: 43 }) {}
/** The GL Entry's `validate_cost_center`: "Cost Center does not belong to Company", here judged on create. */
export class LineCostCenterNotInCompany extends Blueprint.error({ line: LineNumber }, { exit: 44 }) {}
/** The GL Entry's `validate_cost_center`: "group cost centers cannot be used in transactions", here judged on create. */
export class LineCostCenterIsGroup extends Blueprint.error({ line: LineNumber }, { exit: 45 }) {}
/** ERPNext's `validate_debit_credit_amount`: "Both Debit and Credit values cannot be zero". */
export class LineWithoutAmount extends Blueprint.error({ line: LineNumber }, { exit: 46 }) {}
/** ERPNext's `set_total_debit_credit`: "You cannot credit and debit same account at the same time". */
export class LineDebitAndCredit extends Blueprint.error({ line: LineNumber }, { exit: 47 }) {}
/** ERPNext's `validate_total_debit_and_credit`: "Total Debit must be equal to Total Credit". It carries debit less credit. */
export class JournalEntryUnbalanced extends Blueprint.error({ difference: Balance }, { exit: 48 }) {}
/** ERPNext's `get_fiscal_year`: the posting day "is not in any active Fiscal Year" of the company. */
export class PostingDateOutsideFiscalYear extends Blueprint.error({ postingDate: Day }, { exit: 49 }) {}
