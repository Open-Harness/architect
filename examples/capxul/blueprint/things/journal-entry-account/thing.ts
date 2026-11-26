import { Blueprint } from "orthograph";
import { JournalEntry } from "../journal-entry/thing.ts";
import { Account } from "../account/thing.ts";
import { CostCenter } from "../cost-center/thing.ts";
import { Amount } from "../../values/expenses.ts";
import { LineNumber } from "../../values/ledger.ts";

// ERPNext's Journal Entry Account (erpnext/accounts/doctype/journal_entry_account), the child table of a Journal
// Entry: one row per line, in USDC base units. `journal-entry.create` writes them all with the entry; nothing else
// does. The party, reference, exchange-rate and `*_in_account_currency` fields are left out (CX-grill, section 3;
// `decisions/CX-ledger.md`).
export const JournalEntryAccount = Blueprint.thing({
  description: "One line of a journal entry: an account debited or credited.",
  code: "JL",
  fields: {
    id: Blueprint.id("jel"),
    journalEntry: JournalEntry.fields.id,
    line: LineNumber,
    account: Account.fields.id,
    costCenter: CostCenter.fields.id,
    debit: Amount,
    credit: Amount,
  },
});
