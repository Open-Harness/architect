<!-- Generated from the blueprint. Do not edit. -->
# journal-entry-account.list

List journal-entry-accounts, oldest first, 50 to a page, filtered by journalEntry.

**Who may call:** the owner of its journalEntry.company.

**A read:** answered from the records, with no handler. A page of 50 at a time, oldest first, narrowed by journalEntry; pass the answer's `next` as `cursor` for the page after it.

**Budget:** p95 80ms.

## Payload

| field | value |
|---|---|
| journalEntry (optional) | journal-entry-account.journalEntry |
| cursor (optional) | text |

## Answer

| field | value |
|---|---|
| items | schema |
| next | schema |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its journalEntry.company; the handler never runs |

## Worked examples

### draft a journal entry

Starts from the world `a fiscal year`.

- **nor its lines.** `bo` (signed in) calls and sends journalEntry the last call's journalEntry, and is refused with NotAllowed, AR-001.
- **its lines read back in the order given, numbered from 1.** `ada` (role company.owner) calls and sends journalEntry the last call's journalEntry, and gets back [[`1`, the world's rent, the world's costCenter, `1200000000`, `0`], [`2`, the world's bank, the world's costCenter, `0`, `1000000000`], [`3`, the world's bank, the world's costCenter, `0`, `200000000`]].

## How to call

```sh
capxul journal-entry-account list [--journalEntry <journalEntry>] [--cursor <cursor>]
```

HTTP: `POST /journal-entry-account/list` with the payload as JSON. SDK: `Sdk.journal-entry-account.list(payload)`.
