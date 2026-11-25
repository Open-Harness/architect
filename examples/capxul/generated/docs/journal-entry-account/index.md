<!-- Generated from the blueprint. Do not edit. -->
# journal-entry-account

One line of a journal entry: an account debited or credited.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| journalEntry | journal-entry.id |
| line | LineNumber |
| account | account.id |
| costCenter | cost-center.id |
| debit | Amount |
| credit | Amount |

## Operations

- [journal-entry-account.list](list.md): List journal-entry-accounts, oldest first, 50 to a page, filtered by journalEntry.
