import { Blueprint } from "orthograph";
import { JournalEntry } from "./thing.ts";
import { LineCount } from "../../values/ledger.ts";

export const JournalEntryDrafted = Blueprint.event({
  journalEntry: JournalEntry.fields.id,
  company: JournalEntry.fields.company,
  totalDebit: JournalEntry.fields.totalDebit,
  totalCredit: JournalEntry.fields.totalCredit,
});
/** `posted` is how many ledger lines the submit wrote: one per line. */
export const JournalEntrySubmitted = Blueprint.event({ journalEntry: JournalEntry.fields.id, posted: LineCount });
/** `reversed` is how many reversing ledger lines the cancel wrote: one per line posted. */
export const JournalEntryCancelled = Blueprint.event({ journalEntry: JournalEntry.fields.id, reversed: LineCount });
