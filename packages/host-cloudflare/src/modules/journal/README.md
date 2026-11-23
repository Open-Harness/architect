# journal

`JournalD1`: language-effect's `Journal` over D1, in the `_journal` table (the generated migration makes it). The world's facts door reads it by trace for `prove`. Test: `journal.test.ts`, on real
workerd with a real local D1.

`JournalD1.across(dbs)` reads the default's `_journal` and each declared store's (K3): a store keeps the journal of its
own commits beside its tables.
