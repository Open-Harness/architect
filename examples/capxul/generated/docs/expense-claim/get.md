<!-- Generated from the blueprint. Do not edit. -->
# expense-claim.get

Read one expense-claim by its id: company, employee, postingDate, totalClaimedAmount, totalSanctionedAmount, state.

**Who may call:** the self of its employee, or the owner of its company.

**A read:** answered from the records, with no handler.

**Budget:** p95 50ms.

## Payload

| field | value |
|---|---|
| id | expense-claim.id |

## Answer

| field | value |
|---|---|
| company | expense-claim.company |
| employee | expense-claim.employee |
| postingDate | expense-claim.postingDate |
| totalClaimedAmount | expense-claim.totalClaimedAmount |
| totalSanctionedAmount | expense-claim.totalSanctionedAmount |
| state | text |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the self of its employee, or the owner of its company; the handler never runs |

## Worked examples

### claim expenses

Starts from the world `an expense claim with two types`.

- **the new claim reads back as Olga's, posted on 21 November.** `olga` (signed in) calls and sends id the last call's expenseClaim, and gets back [the world's company, the world's employee, `2026-11-21`, `0`, `0`, `draft`].
- **her first claim reads back with nothing claimed yet.** `olga` (signed in) calls and sends id the world's expenseClaim, and gets back [the world's company, the world's employee, `2026-11-20`, `0`, `0`, `draft`].
- **Bo can't read Olga's claim.** `bo` (signed in) calls and sends id the world's expenseClaim, and is refused with NotAllowed, AR-001.
- **the claim reads back with both totals.** `olga` (signed in) calls and sends id the world's expenseClaim, and gets back [`165500000`, `145000000`, `draft`].
- **it still reads back with what was approved.** `olga` (signed in) calls and sends id the world's expenseClaim, and gets back [the world's company, the world's employee, `2026-11-20`, `165500000`, `145000000`, `approved`].

### expense claims stay in their company

Starts from the world `an expense claim`.

- **it reads back approved, owing nothing.** `olga` (signed in) calls and sends id the world's expenseClaim, and gets back [the world's company, the world's employee, `2026-11-20`, `500000`, `0`, `approved`].

### reject an expense claim

Starts from the world `an expense claim`.

- **a rejected claim sanctions nothing, and keeps what was claimed.** `olga` (signed in) calls and sends id the world's expenseClaim, and gets back [the world's company, the world's employee, `2026-11-20`, `30000000`, `0`, `rejected`].
- **the second claim reads back rejected, on its own day.** `olga` (signed in) calls and sends id the last call's expenseClaim, and gets back [the world's company, the world's employee, `2026-12-02`, `0`, `0`, `rejected`].
- **the third claim reads back rejected: it keeps its 4 USDC claimed and sanctions nothing.** `olga` (signed in) calls and sends id the last call's expenseClaim, and gets back [`2026-12-03`, `4000000`, `0`, `rejected`].

## How to call

```sh
capxul expense-claim get --id <id>
```

HTTP: `POST /expense-claim/get` with the payload as JSON. SDK: `Sdk.expense-claim.get(payload)`.
