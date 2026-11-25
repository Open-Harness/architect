<!-- Generated from the blueprint. Do not edit. -->
# journal-entry.cancel

Cancel a submitted journal entry, posting a reversing ledger line for each it posted.

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
| reversed | LineCount |

## Move

`cancel`: from submitted to cancelled, emitting JournalEntryCancelled.

## Steps

- `journal-entry.cancel.load` (database)
- `journal-entry.cancel.reverse` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| JournalEntryNotDraft | 40 | JE-900 | the journal-entry is in a state cancel can't start from; carries `state` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its journalEntry.company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### keep the books

Starts from the world `a chart`.

- **Ada cancels the rent entry, the voucher that line names: two reversing lines.** `ada` (role company.owner) calls and sends journalEntry the last call's items 0 voucherId, and gets back `2`.

### post a journal entry

Starts from the world `a capital entry`.

- **Ada can't cancel it while it is a draft.** `ada` (role company.owner) calls and sends journalEntry the world's journalEntry, and is refused with JournalEntryNotDraft, JE-900, carrying state `draft`.
- **Bo can't cancel it.** `bo` (signed in) calls and sends journalEntry the world's journalEntry, and is refused with NotAllowed, AR-001.
- **Ada cancels it: two reversing lines.** `ada` (role company.owner) calls and sends journalEntry the world's journalEntry, and gets back [the world's journalEntry, `2`].
- **it can't be cancelled twice.** `ada` (role company.owner) calls and sends journalEntry the world's journalEntry, and is refused with JournalEntryNotDraft, JE-900, carrying state `cancelled`.

## How to call

```sh
capxul journal-entry cancel --journalEntry <journalEntry>
```

HTTP: `POST /journal-entry/cancel` with the payload as JSON. SDK: `Sdk.journal-entry.cancel(payload)`.
