import { Blueprint } from "orthograph";
import { Company } from "../company/thing.ts";
import { BankAccount } from "../bank-account/thing.ts";
import { Day } from "../../values/employee.ts";
import { Amount } from "../../values/expenses.ts";
import { AccountCurrency, BridgeRef, Party } from "../../values/bridge.ts";

// ERPNext's Bank Transaction (erpnext/accounts/doctype/bank_transaction): one movement of money on a company's bank
// account, which Bridge reports. `deposit` and `withdrawal` are ERPNext's two Currency fields, held as USDC in base units
// (CX-grill, section 3): Bridge lands a deposit as USDC and sends a transfer from it, both in dollars. One of the two is
// 0. `reference` is ERPNext's `reference_number`, here Bridge's id for the movement, and `party` its `bank_party_name`.
export const BankTransaction = Blueprint.thing({
  description: "One movement of money on a company's bank account: a deposit Bridge landed, or a transfer out.",
  code: "BT",
  fields: {
    id: Blueprint.id("btx"),
    company: Company.fields.id,
    account: Blueprint.described(BankAccount.fields.id, "The company's bank account the money moved on."),
    date: Blueprint.described(Day, "The day the money moved, as Bridge dates it."),
    deposit: Blueprint.described(Amount, "What came in, in USDC base units; 0 for a transfer out."),
    withdrawal: Blueprint.described(Amount, "What went out, in USDC base units; 0 for a deposit."),
    currency: Blueprint.described(AccountCurrency, "The bank account's currency, which the money moved in at the bank."),
    reference: Blueprint.described(BridgeRef, "Bridge's id for the movement: the deposit's, or the transfer's."),
    party: Blueprint.described(Party, "Who sent the deposit, or the external account the transfer pays."),
  },
});
