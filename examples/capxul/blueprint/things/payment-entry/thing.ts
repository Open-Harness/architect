import { Blueprint } from "orthograph";
import { Company } from "../company/thing.ts";
import { Account } from "../account/thing.ts";
import { CostCenter } from "../cost-center/thing.ts";
import { Day } from "../../values/employee.ts";
import { Amount } from "../../values/expenses.ts";
import { PartyId, PartyType, PaymentType } from "../../values/parties.ts";

// ERPNext's Payment Entry (erpnext/accounts/doctype/payment_entry), submittable: money received from a party or paid to
// one, in USDC base units. On Receive, `paidFrom` is the party's account and `paidTo` the bank or cash the money reaches;
// on Pay, `paidFrom` is the bank or cash and `paidTo` the party's account (`setup_party_account_field`). It references no
// invoice yet, so the whole amount is unallocated: an advance. References, deductions, taxes, Internal Transfer, the
// reference number and date, the mode of payment, exchange rates and the received amount (always the paid amount in
// one asset) come later (`decisions/CX-parties-payments.md`).
export const PaymentEntry = Blueprint.thing({
  description: "Money a company receives from a customer or supplier, or pays to one, posted to the ledger when submitted.",
  code: "PY",
  fields: {
    id: Blueprint.id("pen"),
    company: Company.fields.id,
    paymentType: PaymentType,
    postingDate: Day,
    partyType: PartyType,
    party: PartyId,
    paidFrom: Account.fields.id,
    paidTo: Account.fields.id,
    paidAmount: Amount,
    costCenter: CostCenter.fields.id,
  },
});
