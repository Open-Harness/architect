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
- **Bank on the rent's own day counts the rent.** `ada` (role company.owner) calls and sends account the world's bank, onDay `2026-02-01`, and gets back [`10000000000`, `1500000000`, `8500000000`].
- **the day before, it doesn't.** `ada` (role company.owner) calls and sends account the world's bank, onDay `2026-01-31`, and gets back [`10000000000`, `0`, `10000000000`].
- **on the capital's own day it counts the capital.** `ada` (role company.owner) calls and sends account the world's bank, onDay `2026-01-15`, and gets back [`10000000000`, `0`, `10000000000`].
- **and the day before that, nothing.** `ada` (role company.owner) calls and sends account the world's bank, onDay `2026-01-14`, and gets back [`0`, `0`, `0`].
- **Bank's balance is the capital alone again.** `ada` (role company.owner) calls and sends account the world's bank, onDay `2026-12-31`, and gets back [`10000000000`, `0`, `10000000000`].
- **Assets too.** `ada` (role company.owner) calls and sends account the world's assets, onDay `2026-12-31`, and gets back [`10000000000`, `0`, `10000000000`].
- **Expenses holds nothing.** `ada` (role company.owner) calls and sends account the world's expenses, onDay `2026-12-31`, and gets back [`0`, `0`, `0`].
- **and Capital Stock is untouched.** `ada` (role company.owner) calls and sends account the world's capital, onDay `2026-12-31`, and gets back [`0`, `10000000000`, `-10000000000`].

### post a journal entry

Starts from the world `a capital entry`.

- **nor its balance.** `bo` (signed in) calls and sends account the world's bank, onDay `2026-12-31`, and is refused with NotAllowed, AR-001.
- **Bank's balance is the capital.** `ada` (role company.owner) calls and sends account the world's bank, onDay `2026-12-31`, and gets back [`10000000000`, `0`, `10000000000`].
- **Bank's balance is nothing again.** `ada` (role company.owner) calls and sends account the world's bank, onDay `2026-12-31`, and gets back [`0`, `0`, `0`].
- **and Capital Stock's.** `ada` (role company.owner) calls and sends account the world's capital, onDay `2026-12-31`, and gets back [`0`, `0`, `0`].
- **Bank's balance at 2026's end counts 2026's three entries, and not the cancelled capital or 2027's rent.** `ada` (role company.owner) calls and sends account the world's bank, onDay `2026-12-31`, and gets back [`0`, `170000000`, `-170000000`].
- **at 2027's end it counts 2027's rent too.** `ada` (role company.owner) calls and sends account the world's bank, onDay `2027-12-31`, and gets back [`0`, `220000000`, `-220000000`].
- **Expenses, two groups above Rent, the same the other way.** `ada` (role company.owner) calls and sends account the world's expenses, onDay `2027-12-31`, and gets back [`220000000`, `0`, `220000000`].
- **Assets, above Bank, too.** `ada` (role company.owner) calls and sends account the world's assets, onDay `2027-12-31`, and gets back [`0`, `220000000`, `-220000000`].
- **Equity, whose only lines were cancelled, holds nothing.** `ada` (role company.owner) calls and sends account the world's equity, onDay `2027-12-31`, and gets back [`0`, `0`, `0`].

## How to call

```sh
capxul account balance --account <account> --onDay <onDay>
```

HTTP: `POST /account/balance` with the payload as JSON. SDK: `Sdk.account.balance(payload)`.
