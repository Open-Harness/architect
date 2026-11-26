<!-- Generated from the blueprint. Do not edit. -->
# journal-entry.get

Read one journal-entry by its id: company, postingDate, userRemark, totalDebit, totalCredit, state.

**Who may call:** the owner of its company.

**A read:** answered from the records, with no handler.

**Budget:** p95 50ms.

## Payload

| field | value |
|---|---|
| id | journal-entry.id |

## Answer

| field | value |
|---|---|
| company | journal-entry.company |
| postingDate | journal-entry.postingDate |
| userRemark | journal-entry.userRemark |
| totalDebit | journal-entry.totalDebit |
| totalCredit | journal-entry.totalCredit |
| state | text |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its company; the handler never runs |

## Worked examples

### draft a journal entry

Starts from the world `a fiscal year`.

- **it reads back as she typed it.** `ada` (role company.owner) calls and sends id the last call's journalEntry, and gets back [the world's company, `2026-03-02`, `March`, `300000000`, `200000000`, `draft`].
- **Bo can't read it.** `bo` (signed in) calls and sends id the last call's journalEntry, and is refused with NotAllowed, AR-001.

### pay a month

Starts from the world `a pension component`.

- **it reads back as HRMS writes it.** `ada` (role company.owner) calls and sends id the last call's items 0 journalEntry, and gets back [the world's company, `2026-03-31`, `Accrual Journal Entry for salaries from 2026-03-01 to 2026-03-31`, `7000000000`, `7000000000`, `submitted`].

### post a journal entry

Starts from the world `a capital entry`.

- **it reads back submitted, as it was drafted.** `ada` (role company.owner) calls and sends id the world's journalEntry, and gets back [the world's company, `2026-01-15`, `Opening capital`, `10000000000`, `10000000000`, `submitted`].
- **it reads back cancelled.** `ada` (role company.owner) calls and sends id the world's journalEntry, and gets back [`10000000000`, `10000000000`, `cancelled`].
- **it is still a draft.** `ada` (role company.owner) calls and sends id the last call's journalEntry, and gets back [`2025-12-31`, `draft`].

### run a payroll

Starts from the world `an outside cost center`.

- **and so is the journal entry.** `ada` (role company.owner) calls and sends id the last call's items 0 voucherId, and gets back [`2026-12-31`, `Accrual Journal Entry for salaries from 2026-07-01 to 2026-07-31`, `150000000`, `150000000`, `submitted`].

## How to call

```sh
capxul journal-entry get --id <id>
```

HTTP: `POST /journal-entry/get` with the payload as JSON. SDK: `Sdk.journal-entry.get(payload)`.
