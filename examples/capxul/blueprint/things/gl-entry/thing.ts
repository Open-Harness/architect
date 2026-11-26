import { Blueprint } from "orthograph";
import { Company } from "../company/thing.ts";
import { Account } from "../account/thing.ts";
import { CostCenter } from "../cost-center/thing.ts";
import { Day } from "../../values/employee.ts";
import { Amount } from "../../values/expenses.ts";
import { VoucherId, VoucherType } from "../../values/ledger.ts";
import { PartyId, PartyType } from "../../values/parties.ts";

// ERPNext's GL Entry (erpnext/accounts/doctype/gl_entry): one line of the general ledger, in USDC base units. Only a
// voucher's submit or cancel writes one (`erpnext/accounts/general_ledger.py`); no operation of its own makes or
// changes one, so it has no machine, and `isCancelled` is ERPNext's `is_cancelled` flag, not a state. `partyType` and
// `party` are set on a line to a Receivable or Payable account a payment posts, and on its reversal; a party's balance
// is read from them (`decisions/CX-parties-payments.md`). Against, fiscal year, remarks and the currency columns are
// left out (`decisions/CX-ledger.md`).
export const GLEntry = Blueprint.thing({
  description: "One line of a company's general ledger, posted by a voucher.",
  code: "GL",
  fields: {
    id: Blueprint.id("gle"),
    company: Company.fields.id,
    account: Account.fields.id,
    costCenter: CostCenter.fields.id,
    postingDate: Day,
    debit: Amount,
    credit: Amount,
    partyType: Blueprint.optional(PartyType),
    party: Blueprint.optional(PartyId),
    voucherType: VoucherType,
    voucherId: VoucherId,
    isCancelled: Blueprint.described(Blueprint.bool(), "Set on a line its voucher's cancel reversed, and on the reversing line itself: neither counts in a balance."),
  },
});
