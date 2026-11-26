import { Blueprint } from "orthograph";
import { Day } from "../../values/employee.ts";
import { PaymentSide } from "../../values/parties.ts";

// Refusals that depend on data. The machine's own refusal is generated and never written here.
// `payment-entry.create` judges in this order: the two accounts, Paid From then Paid To, each PaymentAccountNotInCompany
// then PaymentAccountIsGroup (the GL Entry's `validate_account_details`, moved to create as the journal entry's line
// checks are, and judged first so no refusal speaks about another company's record); then PaymentCostCenterNotInCompany,
// then PaymentCostCenterIsGroup (the GL Entry's `validate_cost_center`, likewise); then ERPNext's `validate_party_details`:
// PartyAccountWrongType, then PartyNotFound; then PartyNotInCompany (Capxul's own); then PaidAmountZero (ERPNext's
// `validate_mandatory`, which runs after `validate_party_details`).
// `payment-entry.submit` refuses PaymentPostingDateOutsideFiscalYear (the GL Entry's `validate_and_set_fiscal_year`)
// before PartyDisabled (the GL Entry's `validate_party`), the order the GL Entry's `validate` runs them in.
// `payment-entry.cancel` refuses PartyDisabled too: each reversing GL Entry is saved through the same `validate`.
/** The GL Entry's `validate_account_details`: "Account does not belong to Company", here judged on create. It carries the side. */
export class PaymentAccountNotInCompany extends Blueprint.error({ side: PaymentSide }, { exit: 41 }) {}
/** The GL Entry's `validate_account_details`: "is a Group Account and group accounts cannot be used in transactions". */
export class PaymentAccountIsGroup extends Blueprint.error({ side: PaymentSide }, { exit: 42 }) {}
/** The GL Entry's `validate_cost_center`: "Cost Center does not belong to Company", here judged on create. */
export class PaymentCostCenterNotInCompany extends Blueprint.error({}, { exit: 43 }) {}
/** The GL Entry's `validate_cost_center`: "group cost centers cannot be used in transactions", here judged on create. */
export class PaymentCostCenterIsGroup extends Blueprint.error({}, { exit: 44 }) {}
/**
 * ERPNext's `validate_party_details`: "Account {0} and Party Type {1} have different account types". The party's
 * account (Paid From on Receive, Paid To on Pay) must be Receivable for a Customer and Payable for a Supplier, whichever
 * way the money goes.
 */
export class PartyAccountWrongType extends Blueprint.error({}, { exit: 45 }) {}
/** ERPNext's `validate_party_details`: "{0} {1} does not exist", for a party that isn't a record of its party type. */
export class PartyNotFound extends Blueprint.error({}, { exit: 46 }) {}
/** The party belongs to another company. Capxul's own: ERPNext's parties are site-wide. */
export class PartyNotInCompany extends Blueprint.error({}, { exit: 47 }) {}
/** ERPNext's `validate_mandatory`: "Paid Amount is mandatory", for an amount of nothing. */
export class PaidAmountZero extends Blueprint.error({}, { exit: 48 }) {}
/** ERPNext's `get_fiscal_year`, from the GL Entry's `validate_and_set_fiscal_year`: the posting day "is not in any active Fiscal Year" of the company. */
export class PaymentPostingDateOutsideFiscalYear extends Blueprint.error({ postingDate: Day }, { exit: 49 }) {}
/** ERPNext's `validate_party_frozen_disabled`, from the GL Entry's `validate_party`: "{0} {1} is disabled". */
export class PartyDisabled extends Blueprint.error({}, { exit: 50 }) {}
