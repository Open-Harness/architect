import { Blueprint } from "orthograph";
import usdc from "../assets/usdc.ts";

/** What a fiscal year is called (ERPNext's Fiscal Year `year`, which names it): 2026, or 2026-2027. */
export const YearName = Blueprint.value(Blueprint.text({ max: 140 }));
/**
 * The five kinds of account at the top of a chart (ERPNext's Account `root_type`). A root account names its own; every
 * account under it has the same one.
 */
export const RootType = Blueprint.value(Blueprint.oneOf(["Asset", "Liability", "Equity", "Income", "Expense"]));
/**
 * Which statement an account is reported in (ERPNext's `report_type`), worked out from its root type: Asset, Liability
 * and Equity on the Balance Sheet, Income and Expense in Profit and Loss.
 */
export const ReportType = Blueprint.value(Blueprint.oneOf(["Balance Sheet", "Profit and Loss"]));
/**
 * What an account holds (ERPNext's `account_type`), for the types Capxul uses so far. ERPNext has 32; the rest come
 * with the parts of the books that read them (stock, fixed assets, rounding).
 */
export const AccountType = Blueprint.value(Blueprint.oneOf(["Bank", "Cash", "Receivable", "Payable", "Tax"]));
/** A line's place in its journal entry, from 1 (ERPNext's row `idx`). */
export const LineNumber = Blueprint.value(Blueprint.uint(16));
/** How many ledger lines a call posted. */
export const LineCount = Blueprint.value(Blueprint.uint(16));
/** A note on a journal entry (ERPNext's `user_remark`, Small Text). */
export const Remark = Blueprint.value(Blueprint.text({ max: 1000 }));
/**
 * The kind of record a ledger line was posted by (ERPNext's GL Entry `voucher_type`). Journal Entry for now; Sales
 * Invoice, Payment Entry, Expense Claim and Salary Slip join as each is built.
 */
export const VoucherType = Blueprint.value(Blueprint.oneOf(["Journal Entry"]));
/** The id of the record a ledger line was posted by (ERPNext's `voucher_no`, a Dynamic Link): a `jen_` id for now. */
export const VoucherId = Blueprint.value(Blueprint.text({ max: 64 }));
/**
 * An account's balance in USDC base units: its debits less its credits, so negative when credits are more (ERPNext's
 * `get_balance_on`).
 */
export const Balance = Blueprint.value(Blueprint.money(usdc, { signed: true }));
