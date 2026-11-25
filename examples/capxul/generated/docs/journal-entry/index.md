<!-- Generated from the blueprint. Do not edit. -->
# journal-entry

A company's own entry in its books: lines debiting and crediting accounts, posted to the ledger when submitted.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| company | company.id |
| postingDate | Day |
| userRemark | Remark |
| totalDebit | Amount |
| totalCredit | Amount |

## Machine

States: draft, submitted, cancelled. A move from the wrong state is refused JournalEntryNotDraft (exit 40).

| move | from | to | emits |
|---|---|---|---|
| create | (creates) | draft | JournalEntryDrafted |
| submit | draft | submitted | JournalEntrySubmitted |
| cancel | submitted | cancelled | JournalEntryCancelled |

## Events

- `JournalEntryCancelled`: carries journalEntry (journal-entry.id), reversed (LineCount); emitted by the move cancel
- `JournalEntryDrafted`: carries journalEntry (journal-entry.id), company (journal-entry.company), totalDebit (journal-entry.totalDebit), totalCredit (journal-entry.totalCredit); emitted by the move create
- `JournalEntrySubmitted`: carries journalEntry (journal-entry.id), posted (LineCount); emitted by the move submit

## Operations

- [journal-entry.cancel](cancel.md): Cancel a submitted journal entry, posting a reversing ledger line for each it posted.
- [journal-entry.create](create.md): Draft a journal entry with its lines.
- [journal-entry.get](get.md): Read one journal-entry by its id: company, postingDate, userRemark, totalDebit, totalCredit, state.
- [journal-entry.submit](submit.md): Submit a balanced journal entry, posting one ledger line per line.
