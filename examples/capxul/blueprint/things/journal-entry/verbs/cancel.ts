import { Blueprint } from "orthograph";
import { JournalEntry } from "../thing.ts";
import { machine } from "../machine.ts";
import { owner } from "../../company/roles.ts";
import { GLEntry } from "../../gl-entry/thing.ts";
import { LineCount } from "../../../values/ledger.ts";

// ERPNext's `on_cancel`, through `make_reverse_gl_entries` with the immutable ledger off (its default): every ledger
// line the submit posted is marked cancelled, and a reversing line is posted for each, debit and credit swapped, on
// the same account, cost center and posting day, marked cancelled too. Nothing is deleted. A cancelled line counts in
// no balance (`get_balance_on`'s `is_cancelled=0`), so the entry's effect is gone and its history stays
// (`decisions/CX-ledger.md`).
export default Blueprint.operation(JournalEntry, {
  description: "Cancel a submitted journal entry, posting a reversing ledger line for each it posted.",
  payload: { journalEntry: JournalEntry.fields.id },
  answer: { journalEntry: JournalEntry.fields.id, reversed: LineCount },
  move: machine.moves.cancel,
  allowed: [owner.of("journalEntry.company")],
  steps: { load: Blueprint.step.database({ writes: [] }), reverse: Blueprint.step.database({ writes: [JournalEntry, GLEntry] }) },
  idempotent: "request",
  budget: { p95: "300 millis" },
});
