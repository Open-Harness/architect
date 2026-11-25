<!-- Generated from the blueprint. Do not edit. -->
# journal-entry.submit

Submit a balanced journal entry, posting one ledger line per line.

**Who may call:** the owner of its journalEntry.company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 300ms.

## Payload

| field | value |
|---|---|
| journalEntry | journal-entry.id |

## Answer

| field | value |
|---|---|
| journalEntry | journal-entry.id |
| posted | LineCount |

## Move

`submit`: from draft to submitted, emitting JournalEntrySubmitted.

## Steps

- `journal-entry.submit.load` (database)
- `journal-entry.submit.post` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| JournalEntryUnbalanced | 48 | JE-008 | declared in errors.ts, carrying difference |
| PostingDateOutsideFiscalYear | 49 | JE-009 | declared in errors.ts, carrying postingDate |
| JournalEntryNotDraft | 40 | JE-900 | the journal-entry is in a state submit can't start from; carries `state` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its journalEntry.company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### keep the books

Starts from the world `a chart`.

- **and submits it, posting two ledger lines.** `ada` (role company.owner) calls and sends journalEntry the last call's journalEntry, and gets back `2`.
- **and submits it.** `ada` (role company.owner) calls and sends journalEntry the last call's journalEntry, and gets back `2`.

### post a journal entry

Starts from the world `a capital entry`.

- **Bo can't submit it.** `bo` (signed in) calls and sends journalEntry the world's journalEntry, and is refused with NotAllowed, AR-001.
- **Ada submits it: two ledger lines.** `ada` (role company.owner) calls and sends journalEntry the world's journalEntry, and gets back [the world's journalEntry, `2`].
- **Ada can't submit it twice.** `ada` (role company.owner) calls and sends journalEntry the world's journalEntry, and is refused with JournalEntryNotDraft, JE-900, carrying state `submitted`.
- **nor submitted again.** `ada` (role company.owner) calls and sends journalEntry the world's journalEntry, and is refused with JournalEntryNotDraft, JE-900, carrying state `cancelled`.
- **it can't be submitted, and carries the difference.** `ada` (role company.owner) calls and sends journalEntry the last call's journalEntry, and is refused with JournalEntryUnbalanced, JE-008, carrying difference `40000000`.
- **so it can't be submitted either.** `ada` (role company.owner) calls and sends journalEntry the last call's journalEntry, and is refused with JournalEntryUnbalanced, JE-008, carrying difference `-40000000`.
- **and refused.** `ada` (role company.owner) calls and sends journalEntry the last call's journalEntry, and is refused with JournalEntryUnbalanced, JE-008, carrying difference `1`.
- **is refused for its balance first.** `ada` (role company.owner) calls and sends journalEntry the last call's journalEntry, and is refused with JournalEntryUnbalanced, JE-008, carrying difference `40000000`.
- **falls in no fiscal year of Acme Trading's.** `ada` (role company.owner) calls and sends journalEntry the last call's journalEntry, and is refused with PostingDateOutsideFiscalYear, JE-009, carrying postingDate `2025-12-31`.
- **is refused too.** `ada` (role company.owner) calls and sends journalEntry the last call's journalEntry, and is refused with PostingDateOutsideFiscalYear, JE-009, carrying postingDate `2027-01-01`.
- **is still refused.** `ada` (role company.owner) calls and sends journalEntry the last call's journalEntry, and is refused with PostingDateOutsideFiscalYear, JE-009, carrying postingDate `2027-06-01`.
- **is submitted.** `ada` (role company.owner) calls and sends journalEntry the last call's journalEntry, and gets back `2`.
- **is submitted, posting three lines: the two on Bank are not merged.** `ada` (role company.owner) calls and sends journalEntry the last call's journalEntry, and gets back `3`.
- **is submitted.** `ada` (role company.owner) calls and sends journalEntry the last call's journalEntry, and gets back `2`.
- **is submitted.** `ada` (role company.owner) calls and sends journalEntry the last call's journalEntry, and gets back `2`.

## How to call

```sh
capxul journal-entry submit --journalEntry <journalEntry>
```

HTTP: `POST /journal-entry/submit` with the payload as JSON. SDK: `Sdk.journal-entry.submit(payload)`.
