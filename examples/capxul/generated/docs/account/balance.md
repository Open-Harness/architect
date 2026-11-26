<!-- Generated from the blueprint. Do not edit. -->
# account.balance

An account's balance on a day: its own ledger lines and those of every account under it.

**Who may call:** the owner of its account.company.

**Budget:** p95 300ms.

## Payload

| field | value | description |
|---|---|---|
| account | account.id |  |
| onDay | Day | The last day counted: lines posted on it count. |

## Answer

| field | value |
|---|---|
| account | account.id |
| debit | Amount |
| credit | Amount |
| balance | Balance |

## Steps

- `account.balance.sum` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its account.company; the handler never runs |

## Worked examples

### keep the books

Starts from the world `a chart`.

- **Bank's balance at the year's end: 10,000 in, 1,500 out.** `ada` (role company.owner) calls and sends account the world's bank, onDay `2026-12-31`, and gets back [the world's bank, `10000000000`, `1500000000`, `8500000000`].
- **Assets, the group above it, holds the same.** `ada` (role company.owner) calls and sends account the world's assets, onDay `2026-12-31`, and gets back [the world's assets, `10000000000`, `1500000000`, `8500000000`].
- **Expenses, two groups above Rent, holds the rent.** `ada` (role company.owner) calls and sends account the world's expenses, onDay `2026-12-31`, and gets back [`1500000000`, `0`, `1500000000`].
- **and so does Operating Expenses, between them.** `ada` (role company.owner) calls and sends account the world's operating, onDay `2026-12-31`, and gets back [`1500000000`, `0`, `1500000000`].
- **Capital Stock is in credit, so its balance is negative.** `ada` (role company.owner) calls and sends account the world's capital, onDay `2026-12-31`, and gets back [`0`, `10000000000`, `-10000000000`].
- **and Equity above it the same.** `ada` (role company.owner) calls and sends account the world's equity, onDay `2026-12-31`, and gets back [`0`, `10000000000`, `-10000000000`].
- **Assets now holds both its ledgers, read again after the new one was added.** `ada` (role company.owner) calls and sends account the world's assets, onDay `2026-12-31`, and gets back [`10200000000`, `1500000000`, `8700000000`].
- **Assets on 14 January, before any entry, holds nothing: the day limit holds below the group too.** `ada` (role company.owner) calls and sends account the world's assets, onDay `2026-01-14`, and gets back [`0`, `0`, `0`].
- **Expenses on 31 January, before the rent, holds nothing.** `ada` (role company.owner) calls and sends account the world's expenses, onDay `2026-01-31`, and gets back [`0`, `0`, `0`].
- **Bank on the rent's own day counts the rent.** `ada` (role company.owner) calls and sends account the world's bank, onDay `2026-02-01`, and gets back [`10000000000`, `1500000000`, `8500000000`].
- **the day before, it doesn't.** `ada` (role company.owner) calls and sends account the world's bank, onDay `2026-01-31`, and gets back [`10000000000`, `0`, `10000000000`].
- **on the capital's own day it counts the capital.** `ada` (role company.owner) calls and sends account the world's bank, onDay `2026-01-15`, and gets back [`10000000000`, `0`, `10000000000`].
- **and the day before that, nothing.** `ada` (role company.owner) calls and sends account the world's bank, onDay `2026-01-14`, and gets back [`0`, `0`, `0`].
- **Bank's balance is the capital alone again.** `ada` (role company.owner) calls and sends account the world's bank, onDay `2026-12-31`, and gets back [`10000000000`, `0`, `10000000000`].
- **Assets holds the capital in both its ledgers.** `ada` (role company.owner) calls and sends account the world's assets, onDay `2026-12-31`, and gets back [`10200000000`, `0`, `10200000000`].
- **Expenses holds nothing.** `ada` (role company.owner) calls and sends account the world's expenses, onDay `2026-12-31`, and gets back [`0`, `0`, `0`].
- **and Capital Stock keeps the capital the cancel left alone.** `ada` (role company.owner) calls and sends account the world's capital, onDay `2026-12-31`, and gets back [`0`, `10200000000`, `-10200000000`].

### pay a month

Starts from the world `a pension component`.

- **Salaries holds the month's pay.** `ada` (role company.owner) calls and sends account the world's salaries, onDay `2026-03-31`, and gets back [`7000000000`, `0`, `7000000000`].
- **not the day before.** `ada` (role company.owner) calls and sends account the world's salaries, onDay `2026-03-30`, and gets back [`0`, `0`, `0`].
- **Expenses, two groups above, holds it too.** `ada` (role company.owner) calls and sends account the world's expenses, onDay `2026-12-31`, and gets back [`7000000000`, `0`, `7000000000`].
- **Pension Payable owes the pension.** `ada` (role company.owner) calls and sends account the world's pension, onDay `2026-12-31`, and gets back [`0`, `300000000`, `-300000000`].
- **Payroll Payable owes the net pay.** `ada` (role company.owner) calls and sends account the world's payable, onDay `2026-12-31`, and gets back [`0`, `6700000000`, `-6700000000`].
- **Liabilities owes both.** `ada` (role company.owner) calls and sends account the world's liabilities, onDay `2026-12-31`, and gets back [`0`, `7000000000`, `-7000000000`].

### post a journal entry

Starts from the world `a capital entry`.

- **nor its balance.** `bo` (signed in) calls and sends account the world's bank, onDay `2026-12-31`, and is refused with NotAllowed, AR-001.
- **Bank's balance is the capital.** `ada` (role company.owner) calls and sends account the world's bank, onDay `2026-12-31`, and gets back [`10000000000`, `0`, `10000000000`].
- **Bank's balance is nothing again.** `ada` (role company.owner) calls and sends account the world's bank, onDay `2026-12-31`, and gets back [`0`, `0`, `0`].
- **and Capital Stock's.** `ada` (role company.owner) calls and sends account the world's capital, onDay `2026-12-31`, and gets back [`0`, `0`, `0`].
- **Bank's balance at 2026's end counts both, and not the cancelled entries or 2027's rent.** `ada` (role company.owner) calls and sends account the world's bank, onDay `2026-12-31`, and gets back [`0`, `150000000`, `-150000000`].
- **at 2027's end it counts 2027's rent too.** `ada` (role company.owner) calls and sends account the world's bank, onDay `2027-12-31`, and gets back [`0`, `200000000`, `-200000000`].
- **Expenses, two groups above Rent, the same the other way.** `ada` (role company.owner) calls and sends account the world's expenses, onDay `2027-12-31`, and gets back [`200000000`, `0`, `200000000`].
- **Assets, above Bank, too.** `ada` (role company.owner) calls and sends account the world's assets, onDay `2027-12-31`, and gets back [`0`, `200000000`, `-200000000`].
- **Equity, whose only lines were cancelled, holds nothing.** `ada` (role company.owner) calls and sends account the world's equity, onDay `2027-12-31`, and gets back [`0`, `0`, `0`].

### post a payment entry

Starts from the world `a received advance`.

- **Bank's balance is the advance.** `ada` (role company.owner) calls and sends account the world's bank, onDay `2026-12-31`, and gets back [`500000000`, `0`, `500000000`].
- **Debtors' is the advance owed back, negative.** `ada` (role company.owner) calls and sends account the world's debtors, onDay `2026-12-31`, and gets back [`0`, `500000000`, `-500000000`].
- **and Assets, which holds both, nets to nothing.** `ada` (role company.owner) calls and sends account the world's assets, onDay `2026-12-31`, and gets back [`500000000`, `500000000`, `0`].
- **and Bank's.** `ada` (role company.owner) calls and sends account the world's bank, onDay `2026-12-31`, and gets back [`0`, `0`, `0`].
- **and Debtors'.** `ada` (role company.owner) calls and sends account the world's debtors, onDay `2026-12-31`, and gets back [`0`, `0`, `0`].
- **Liabilities, above Creditors, holds it.** `ada` (role company.owner) calls and sends account the world's liabilities, onDay `2026-12-31`, and gets back [`200000000`, `0`, `200000000`].
- **Bank is 200 USDC down.** `ada` (role company.owner) calls and sends account the world's bank, onDay `2026-12-31`, and gets back [`0`, `200000000`, `-200000000`].
- **while Debtors holds both.** `ada` (role company.owner) calls and sends account the world's debtors, onDay `2026-12-31`, and gets back [`100000000`, `70000000`, `30000000`].
- **while Creditors holds both.** `ada` (role company.owner) calls and sends account the world's creditors, onDay `2026-12-31`, and gets back [`270000000`, `50000000`, `220000000`].

### run a payroll

Starts from the world `an outside cost center`.

- **Salaries holds February, Olga's March and April: E's slips aren't booked yet.** `ada` (role company.owner) calls and sends account the world's salaries, onDay `2026-04-30`, and gets back [`19000000000`, `0`, `19000000000`].
- **Pension Payable owes 600.** `ada` (role company.owner) calls and sends account the world's pension, onDay `2026-04-30`, and gets back [`0`, `600000000`, `-600000000`].
- **Payroll Payable owes 18,400.** `ada` (role company.owner) calls and sends account the world's payable, onDay `2026-04-30`, and gets back [`0`, `18400000000`, `-18400000000`].
- **and 6,700 the day before April's.** `ada` (role company.owner) calls and sends account the world's payable, onDay `2026-04-29`, and gets back [`0`, `6700000000`, `-6700000000`].

## How to call

```sh
capxul account balance --account <account> --onDay <onDay>
```

HTTP: `POST /account/balance` with the payload as JSON. SDK: `Sdk.account.balance(payload)`.
