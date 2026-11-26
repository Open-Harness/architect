<!-- Generated from the blueprint. Do not edit. -->
# journal-entry.create

Draft a journal entry with its lines.

**Who may call:** the owner of its company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 200ms.

## Payload

| field | value | description |
|---|---|---|
| company | journal-entry.company |  |
| postingDate | journal-entry.postingDate |  |
| userRemark | journal-entry.userRemark |  |
| lines | schema | Its lines, in order: each an account, a cost center, and a debit or a credit. At most 50. |

## Answer

| field | value |
|---|---|
| journalEntry | journal-entry.id |
| totalDebit | journal-entry.totalDebit |
| totalCredit | journal-entry.totalCredit |

## Move

`create`: from nothing (it creates) to draft, emitting JournalEntryDrafted.

## Steps

- `journal-entry.create.load` (database)
- `journal-entry.create.insert` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| JournalEntryTooFewLines | 41 | JE-001 | declared in errors.ts |
| LineAccountNotInCompany | 42 | JE-002 | declared in errors.ts, carrying line |
| LineAccountIsGroup | 43 | JE-003 | declared in errors.ts, carrying line |
| LineCostCenterNotInCompany | 44 | JE-004 | declared in errors.ts, carrying line |
| LineCostCenterIsGroup | 45 | JE-005 | declared in errors.ts, carrying line |
| LineWithoutAmount | 46 | JE-006 | declared in errors.ts, carrying line |
| LineDebitAndCredit | 47 | JE-007 | declared in errors.ts, carrying line |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### draft a journal entry

Starts from the world `a fiscal year`.

- **Bo can't draft an entry in Acme Trading.** `bo` (signed in) calls and sends company the world's company, postingDate `2026-03-02`, userRemark `March`, lines [{ account: the world's rent, costCenter: the world's costCenter, debit: `250000000`, credit: `0` }, { account: the world's bank, costCenter: the world's costCenter, debit: `0`, credit: `250000000` }], and is refused with NotAllowed, AR-001.
- **an entry with no lines is refused.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2026-03-02`, userRemark `March`, lines [], and is refused with JournalEntryTooFewLines, JE-001.
- **so is one with one line.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2026-03-02`, userRemark `March`, lines [{ account: the world's rent, costCenter: the world's costCenter, debit: `250000000`, credit: `0` }], and is refused with JournalEntryTooFewLines, JE-001.
- **even when that line is on a group: too few lines is judged first.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2026-03-02`, userRemark `March`, lines [{ account: the world's assets, costCenter: the world's costCenter, debit: `250000000`, credit: `0` }], and is refused with JournalEntryTooFewLines, JE-001.
- **a line on a group account is refused, naming it.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2026-03-02`, userRemark `March`, lines [{ account: the world's assets, costCenter: the world's costCenter, debit: `250000000`, credit: `0` }, { account: the world's bank, costCenter: the world's costCenter, debit: `0`, credit: `250000000` }], and is refused with LineAccountIsGroup, JE-003, carrying line `1`.
- **on the third line of three too.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2026-03-02`, userRemark `March`, lines [{ account: the world's rent, costCenter: the world's costCenter, debit: `250000000`, credit: `0` }, { account: the world's bank, costCenter: the world's costCenter, debit: `0`, credit: `250000000` }, { account: the world's expenses, costCenter: the world's costCenter, debit: `0`, credit: `0` }], and is refused with LineAccountIsGroup, JE-003, carrying line `3`.
- **a line in a group cost center is refused.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2026-03-02`, userRemark `March`, lines [{ account: the world's rent, costCenter: the world's costCenter, debit: `250000000`, credit: `0` }, { account: the world's bank, costCenter: the world's mainCostCenter, debit: `0`, credit: `250000000` }], and is refused with LineCostCenterIsGroup, JE-005, carrying line `2`.
- **line by line: a group cost center on line 1 is refused before a group account on line 2.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2026-03-02`, userRemark `March`, lines [{ account: the world's rent, costCenter: the world's mainCostCenter, debit: `250000000`, credit: `0` }, { account: the world's assets, costCenter: the world's costCenter, debit: `0`, credit: `250000000` }], and is refused with LineCostCenterIsGroup, JE-005, carrying line `1`.
- **and on one line, its group account before its group cost center.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2026-03-02`, userRemark `March`, lines [{ account: the world's rent, costCenter: the world's costCenter, debit: `250000000`, credit: `0` }, { account: the world's equity, costCenter: the world's mainCostCenter, debit: `0`, credit: `250000000` }], and is refused with LineAccountIsGroup, JE-003, carrying line `2`.
- **a line with neither a debit nor a credit is refused.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2026-03-02`, userRemark `March`, lines [{ account: the world's rent, costCenter: the world's costCenter, debit: `250000000`, credit: `0` }, { account: the world's bank, costCenter: the world's costCenter, debit: `0`, credit: `0` }], and is refused with LineWithoutAmount, JE-006, carrying line `2`.
- **but a group account on a later line is judged before it.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2026-03-02`, userRemark `March`, lines [{ account: the world's rent, costCenter: the world's costCenter, debit: `0`, credit: `0` }, { account: the world's operating, costCenter: the world's costCenter, debit: `0`, credit: `250000000` }], and is refused with LineAccountIsGroup, JE-003, carrying line `2`.
- **a line with both a debit and a credit is refused.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2026-03-02`, userRemark `March`, lines [{ account: the world's rent, costCenter: the world's costCenter, debit: `250000000`, credit: `250000000` }, { account: the world's bank, costCenter: the world's costCenter, debit: `0`, credit: `250000000` }], and is refused with LineDebitAndCredit, JE-007, carrying line `1`.
- **a line with neither, after one with both, is refused for having neither.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2026-03-02`, userRemark `March`, lines [{ account: the world's rent, costCenter: the world's costCenter, debit: `250000000`, credit: `250000000` }, { account: the world's bank, costCenter: the world's costCenter, debit: `0`, credit: `0` }], and is refused with LineWithoutAmount, JE-006, carrying line `2`.
- **with two lines lacking an amount, the first is named.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2026-03-02`, userRemark `March`, lines [{ account: the world's rent, costCenter: the world's costCenter, debit: `0`, credit: `0` }, { account: the world's bank, costCenter: the world's costCenter, debit: `0`, credit: `250000000` }, { account: the world's rent, costCenter: the world's costCenter, debit: `0`, credit: `0` }], and is refused with LineWithoutAmount, JE-006, carrying line `1`.
- **with two lines carrying both, the first is named.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2026-03-02`, userRemark `March`, lines [{ account: the world's rent, costCenter: the world's costCenter, debit: `250000000`, credit: `250000000` }, { account: the world's bank, costCenter: the world's costCenter, debit: `250000000`, credit: `250000000` }], and is refused with LineDebitAndCredit, JE-007, carrying line `1`.
- **a line carrying both is found on the last line too.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2026-03-02`, userRemark `March`, lines [{ account: the world's rent, costCenter: the world's costCenter, debit: `250000000`, credit: `0` }, { account: the world's bank, costCenter: the world's costCenter, debit: `250000000`, credit: `250000000` }], and is refused with LineDebitAndCredit, JE-007, carrying line `2`.
- **an Acme Trading entry on Acme Logistics' Bank is refused.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2026-03-02`, userRemark `March`, lines [{ account: the world's rent, costCenter: the world's costCenter, debit: `250000000`, credit: `0` }, { account: the last call's account, costCenter: the world's costCenter, debit: `0`, credit: `250000000` }], and is refused with LineAccountNotInCompany, JE-002, carrying line `2`.
- **it is judged before the line's group cost center.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2026-03-02`, userRemark `March`, lines [{ account: the world's rent, costCenter: the world's costCenter, debit: `250000000`, credit: `0` }, { account: the last call's account, costCenter: the world's mainCostCenter, debit: `0`, credit: `250000000` }], and is refused with LineAccountNotInCompany, JE-002, carrying line `2`.
- **but after an earlier line's group account.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2026-03-02`, userRemark `March`, lines [{ account: the world's assets, costCenter: the world's costCenter, debit: `250000000`, credit: `0` }, { account: the last call's account, costCenter: the world's costCenter, debit: `0`, credit: `250000000` }], and is refused with LineAccountIsGroup, JE-003, carrying line `1`.
- **an Acme Trading line in that other company's cost center is refused.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2026-03-02`, userRemark `March`, lines [{ account: the world's rent, costCenter: the world's costCenter, debit: `250000000`, credit: `0` }, { account: the world's bank, costCenter: the last call's costCenter, debit: `0`, credit: `250000000` }], and is refused with LineCostCenterNotInCompany, JE-004, carrying line `2`.
- **before a later line's group cost center.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2026-03-02`, userRemark `March`, lines [{ account: the world's rent, costCenter: the last call's costCenter, debit: `250000000`, credit: `0` }, { account: the world's bank, costCenter: the world's mainCostCenter, debit: `0`, credit: `250000000` }], and is refused with LineCostCenterNotInCompany, JE-004, carrying line `1`.
- **and before a line's missing amount.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2026-03-02`, userRemark `March`, lines [{ account: the world's rent, costCenter: the world's costCenter, debit: `0`, credit: `0` }, { account: the world's bank, costCenter: the last call's costCenter, debit: `0`, credit: `250000000` }], and is refused with LineCostCenterNotInCompany, JE-004, carrying line `2`.
- **on one line, a group account is judged before another company's cost center.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2026-03-02`, userRemark `March`, lines [{ account: the world's rent, costCenter: the world's costCenter, debit: `250000000`, credit: `0` }, { account: the world's assets, costCenter: the last call's costCenter, debit: `0`, credit: `250000000` }], and is refused with LineAccountIsGroup, JE-003, carrying line `2`.
- **Ada drafts an unbalanced entry: a draft may be.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2026-03-02`, userRemark `March`, lines [{ account: the world's rent, costCenter: the world's costCenter, debit: `300000000`, credit: `0` }, { account: the world's bank, costCenter: the world's costCenter, debit: `0`, credit: `200000000` }], and gets back [`300000000`, `200000000`].
- **Ada drafts March's costs on three lines, two of them on Bank.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2026-03-31`, userRemark `March`, lines [{ account: the world's rent, costCenter: the world's costCenter, debit: `1200000000`, credit: `0` }, { account: the world's bank, costCenter: the world's costCenter, debit: `0`, credit: `1000000000` }, { account: the world's bank, costCenter: the world's costCenter, debit: `0`, credit: `200000000` }], and gets back an answer matching `^jen_[0-9a-z]+$` and gets back [`1200000000`, `1200000000`].

### keep the books

Starts from the world `a chart`.

- **she drafts the opening capital on 15 January: Bank debited, Capital Stock credited, 10,000 USDC.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2026-01-15`, userRemark `Opening capital`, lines [{ account: the world's bank, costCenter: the world's costCenter, debit: `10000000000`, credit: `0` }, { account: the world's capital, costCenter: the world's costCenter, debit: `0`, credit: `10000000000` }], and gets back [`10000000000`, `10000000000`] and gets back an answer matching `^jen_[0-9a-z]+$`.
- **she drafts February's rent on 1 February: Rent debited, Bank credited, 1,500 USDC.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2026-02-01`, userRemark `February rent`, lines [{ account: the world's rent, costCenter: the world's costCenter, debit: `1500000000`, credit: `0` }, { account: the world's bank, costCenter: the world's costCenter, debit: `0`, credit: `1500000000` }], and gets back [`1500000000`, `1500000000`].
- **she moves 200 USDC of capital into it on 20 January.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2026-01-20`, userRemark `Float`, lines [{ account: the last call's account, costCenter: the world's costCenter, debit: `200000000`, credit: `0` }, { account: the world's capital, costCenter: the world's costCenter, debit: `0`, credit: `200000000` }], and gets back [`200000000`, `200000000`].

### post a journal entry

Starts from the world `a capital entry`.

- **Ada drafts an entry with more debit than credit, by 40 USDC.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2026-03-02`, userRemark `Rent`, lines [{ account: the world's rent, costCenter: the world's costCenter, debit: `100000000`, credit: `0` }, { account: the world's bank, costCenter: the world's costCenter, debit: `0`, credit: `60000000` }], and is answered.
- **an entry with more credit than debit carries a negative difference.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2026-03-02`, userRemark `Rent`, lines [{ account: the world's rent, costCenter: the world's costCenter, debit: `60000000`, credit: `0` }, { account: the world's bank, costCenter: the world's costCenter, debit: `0`, credit: `100000000` }], and is answered.
- **an entry out by one base unit is unbalanced.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2026-03-02`, userRemark `Rent`, lines [{ account: the world's rent, costCenter: the world's costCenter, debit: `100000001`, credit: `0` }, { account: the world's bank, costCenter: the world's costCenter, debit: `0`, credit: `100000000` }], and is answered.
- **an unbalanced entry dated outside every fiscal year.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2027-03-02`, userRemark `Rent`, lines [{ account: the world's rent, costCenter: the world's costCenter, debit: `100000000`, credit: `0` }, { account: the world's bank, costCenter: the world's costCenter, debit: `0`, credit: `60000000` }], and is answered.
- **a balanced entry dated 31 December 2025, the day before 2026 starts.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2025-12-31`, userRemark `Rent`, lines [{ account: the world's rent, costCenter: the world's costCenter, debit: `50000000`, credit: `0` }, { account: the world's bank, costCenter: the world's costCenter, debit: `0`, credit: `50000000` }], and is answered.
- **one dated 1 January 2027, the day after it ends.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2027-01-01`, userRemark `Rent`, lines [{ account: the world's rent, costCenter: the world's costCenter, debit: `50000000`, credit: `0` }, { account: the world's bank, costCenter: the world's costCenter, debit: `0`, credit: `50000000` }], and is answered.
- **another company's year doesn't count: an Acme Trading entry dated in 2027.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2027-06-01`, userRemark `Rent`, lines [{ account: the world's rent, costCenter: the world's costCenter, debit: `50000000`, credit: `0` }, { account: the world's bank, costCenter: the world's costCenter, debit: `0`, credit: `50000000` }], and is answered.
- **an entry dated in its second year.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2027-06-01`, userRemark `Rent`, lines [{ account: the world's rent, costCenter: the world's costCenter, debit: `50000000`, credit: `0` }, { account: the world's bank, costCenter: the world's costCenter, debit: `0`, credit: `50000000` }], and is answered.
- **an entry on 1 February 2029, inside it.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2029-02-01`, userRemark `Rent`, lines [{ account: the world's rent, costCenter: the world's costCenter, debit: `10000000`, credit: `0` }, { account: the world's bank, costCenter: the world's costCenter, debit: `0`, credit: `10000000` }], and is answered.
- **an entry on 2026's first day, three lines with two on Bank.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2026-01-01`, userRemark `Rent`, lines [{ account: the world's rent, costCenter: the world's costCenter, debit: `70000000`, credit: `0` }, { account: the world's bank, costCenter: the world's costCenter, debit: `0`, credit: `30000000` }, { account: the world's bank, costCenter: the world's costCenter, debit: `0`, credit: `40000000` }], and is answered.
- **an entry with Bank in Operations and Rent in the new cost center.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2026-06-01`, userRemark `Split`, lines [{ account: the world's bank, costCenter: the world's costCenter, debit: `0`, credit: `20000000` }, { account: the world's rent, costCenter: the last call's costCenter, debit: `20000000`, credit: `0` }], and is answered.
- **an entry on 2026's last day.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2026-12-31`, userRemark `Rent`, lines [{ account: the world's rent, costCenter: the world's costCenter, debit: `80000000`, credit: `0` }, { account: the world's bank, costCenter: the world's costCenter, debit: `0`, credit: `80000000` }], and is answered.

## How to call

```sh
capxul journal-entry create --company <company> --postingDate <postingDate> --userRemark <userRemark> --lines <lines>
```

HTTP: `POST /journal-entry/create` with the payload as JSON. SDK: `Sdk.journal-entry.create(payload)`.
