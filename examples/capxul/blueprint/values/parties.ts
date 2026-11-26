import { Blueprint } from "orthograph";

/**
 * Who a payment or a ledger line is with (ERPNext's Party Type, a record seeded at install with its account type). Capxul
 * takes the two its books use so far, each with the account type its party account must have: a Customer's is
 * Receivable, a Supplier's Payable (`decisions/CX-parties-payments.md`). Employee, Shareholder and Student come later.
 */
export const PartyType = Blueprint.value(Blueprint.oneOf(["Customer", "Supplier"]));
/** The id of the party a payment or a ledger line is with (ERPNext's `party`, a Dynamic Link on the party type): a `cus_` or `sup_` id. */
export const PartyId = Blueprint.value(Blueprint.text({ max: 64 }));
/** Which way a payment goes (ERPNext's Payment Entry `payment_type`): money in, or money out. Internal Transfer comes later. */
export const PaymentType = Blueprint.value(Blueprint.oneOf(["Receive", "Pay"]));
/** What kind of party a customer or a supplier is (ERPNext's `customer_type` and `supplier_type`). */
export const PartyKind = Blueprint.value(Blueprint.oneOf(["Company", "Individual", "Partnership"]));
/** Which of a payment's two accounts a refusal is about: the one money leaves (Paid From) or the one it reaches (Paid To). */
export const PaymentSide = Blueprint.value(Blueprint.oneOf(["Paid From", "Paid To"]));
