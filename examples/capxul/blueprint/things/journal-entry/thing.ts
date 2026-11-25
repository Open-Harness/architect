import { Blueprint } from "orthograph";
import { Company } from "../company/thing.ts";
import { Day } from "../../values/employee.ts";
import { Amount } from "../../values/expenses.ts";
import { Remark } from "../../values/ledger.ts";

// ERPNext's Journal Entry (erpnext/accounts/doctype/journal_entry), submittable: its company, posting day, the owner's
// remark and the totals of its lines (`set_total_debit_credit`), in USDC base units. Its lines are Journal Entry
// Account rows. Its voucher type (always Journal Entry here), naming series, cheque, multi-currency, opening, party and
// inter-company fields come later (`decisions/CX-ledger.md`).
export const JournalEntry = Blueprint.thing({
  description: "A company's own entry in its books: lines debiting and crediting accounts, posted to the ledger when submitted.",
  code: "JE",
  fields: {
    id: Blueprint.id("jen"),
    company: Company.fields.id,
    postingDate: Day,
    userRemark: Remark,
    totalDebit: Amount,
    totalCredit: Amount,
  },
});
