import { Blueprint } from "orthograph";
import { JournalEntry } from "../thing.ts";
import { machine } from "../machine.ts";
import { JournalEntryUnbalanced, PostingDateOutsideFiscalYear } from "../errors.ts";
import { owner } from "../../company/roles.ts";
import { GLEntry } from "../../gl-entry/thing.ts";
import { LineCount } from "../../../values/ledger.ts";

// ERPNext's `before_submit` (balanced) and `on_submit` (`make_gl_entries`): one ledger line per line, with the
// entry's company and posting day, voucher type Journal Entry and the entry's id. Lines on the same account aren't
// merged: ERPNext merges only when Accounts Settings' `merge_similar_account_heads` is on, and it is off by default.
// The posting day must fall in one of the company's fiscal years, both ends counted.
export default Blueprint.operation(JournalEntry, {
  description: "Submit a balanced journal entry, posting one ledger line per line.",
  payload: { journalEntry: JournalEntry.fields.id },
  answer: { journalEntry: JournalEntry.fields.id, posted: LineCount },
  move: machine.moves.submit,
  errors: [JournalEntryUnbalanced, PostingDateOutsideFiscalYear],
  allowed: [owner.of("journalEntry.company")],
  steps: { load: Blueprint.step.database({ writes: [] }), post: Blueprint.step.database({ writes: [JournalEntry, GLEntry] }) },
  idempotent: "request",
  budget: { p95: "300 millis" },
});
