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

### pay a month

Starts from the world `a pension component`.

- **its lines: Salaries debited 7,000, Pension Payable credited 300, Payroll Payable the 6,700 net, all in Operations.** `ada` (role company.owner) calls and sends journalEntry the last call's journalEntry, and gets back [[`1`, the world's salaries, the world's costCenter, `7000000000`, `0`], [`2`, the world's pension, the world's costCenter, `0`, `300000000`], [`3`, the world's payable, the world's costCenter, `0`, `6700000000`]].

### run a payroll

Starts from the world `an outside cost center`.

- **the journal entry: Salaries debited 3,500, Pension Payable credited 150, Payroll Payable the 3,350 net, in Operations.** `ada` (role company.owner) calls and sends journalEntry the last call's journalEntry, and gets back [[`1`, the world's salaries, the world's costCenter, `3500000000`, `0`], [`2`, the world's pension, the world's costCenter, `0`, `150000000`], [`3`, the world's payable, the world's costCenter, `0`, `3350000000`]].
- **one journal entry books all three: Salaries 12,000, Pension Payable 300, Payroll Payable 11,700.** `ada` (role company.owner) calls and sends journalEntry the last call's journalEntry, and gets back [[`1`, the world's salaries, the world's costCenter, `12000000000`, `0`], [`2`, the world's pension, the world's costCenter, `0`, `300000000`], [`3`, the world's payable, the world's costCenter, `0`, `11700000000`]].
- **nothing is deducted, so the journal entry has no pension line: Salaries and Payroll Payable, 5,000 each.** `ada` (role company.owner) calls and sends journalEntry the last call's journalEntry, and gets back [[`1`, the world's salaries, the world's costCenter, `5000000000`, `0`], [`2`, the world's payable, the world's costCenter, `0`, `5000000000`]].
- **a net pay of nothing posts no line to Payroll Payable: Salaries and Pension Payable, 150 each.** `ada` (role company.owner) calls and sends journalEntry the last call's journalEntry, and gets back [[`1`, the world's salaries, the world's costCenter, `150000000`, `0`], [`2`, the world's pension, the world's costCenter, `0`, `150000000`]].
- **its journal entry's lines.** `ada` (role company.owner) calls and sends journalEntry the last call's journalEntry, and gets back 2.
- **Salaries is debited and credited on lines of their own, not netted; the credits in the order the slip meets them.** `ada` (role company.owner) calls and sends journalEntry the last call's journalEntry, and gets back [[`1`, the world's salaries, the world's costCenter, `3000000000`, `0`], [`2`, the world's salaries, the world's costCenter, `0`, `50000000`], [`3`, the world's pension, the world's costCenter, `0`, `150000000`], [`4`, the world's payable, the world's costCenter, `0`, `2800000000`]].
- **the credits follow the other structure's order.** `ada` (role company.owner) calls and sends journalEntry the last call's journalEntry, and gets back [[`1`, the world's salaries, the world's costCenter, `3000000000`, `0`], [`2`, the world's pension, the world's costCenter, `0`, `150000000`], [`3`, the world's salaries, the world's costCenter, `0`, `50000000`], [`4`, the world's payable, the world's costCenter, `0`, `2800000000`]].
- **the debits come in the order the slip meets their accounts: Rent, then Salaries.** `ada` (role company.owner) calls and sends journalEntry the last call's journalEntry, and gets back [[`1`, the world's rent, the world's costCenter, `100000000`, `0`], [`2`, the world's salaries, the world's costCenter, `3000000000`, `0`], [`3`, the world's payable, the world's costCenter, `0`, `3100000000`]].
- **and the other way round: Salaries, then Rent.** `ada` (role company.owner) calls and sends journalEntry the last call's journalEntry, and gets back [[`1`, the world's salaries, the world's costCenter, `3000000000`, `0`], [`2`, the world's rent, the world's costCenter, `100000000`, `0`], [`3`, the world's payable, the world's costCenter, `0`, `3100000000`]].

## How to call

```sh
capxul journal-entry-account list [--journalEntry <journalEntry>] [--cursor <cursor>]
```

HTTP: `POST /journal-entry-account/list` with the payload as JSON. SDK: `Sdk.journal-entry-account.list(payload)`.
