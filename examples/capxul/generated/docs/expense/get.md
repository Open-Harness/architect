<!-- Generated from the blueprint. Do not edit. -->
# expense.get

Read one expense by its id: expenseClaim, expenseDate, expenseType, amount, sanctionedAmount, state.

**Who may call:** the owner of its expenseClaim.company.

**A read:** answered from the records, with no handler.

**Budget:** p95 50ms.

## Payload

| field | value |
|---|---|
| id | expense.id |

## Answer

| field | value |
|---|---|
| expenseClaim | expense.expenseClaim |
| expenseDate | expense.expenseDate |
| expenseType | expense.expenseType |
| amount | expense.amount |
| sanctionedAmount | expense.sanctionedAmount |
| state | text |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its expenseClaim.company; the handler never runs |

## Worked examples

### claim expenses

Starts from the world `an expense claim with two types`.

- **the taxi reads back as Ada typed it.** `ada` (role company.owner) calls and sends id the last call's expense, and gets back [the world's expenseClaim, `2026-11-18`, the world's expenseClaimType, `45000000`, `45000000`, `active`].
- **the hotel reads back with what was spent and what was sanctioned.** `ada` (role company.owner) calls and sends id the last call's expense, and gets back [the world's expenseClaim, `2026-11-19`, the world's lodging, `120500000`, `100000000`].

### expense claims stay in their company

Starts from the world `an expense claim`.

- **that line reads back on Olga's claim, sanctioned at nothing.** `ada` (role company.owner) calls and sends id the last call's expense, and gets back [the world's expenseClaim, `2026-11-19`, the world's expenseClaimType, `500000`, `0`, `active`].

### reject an expense claim

Starts from the world `an expense claim`.

- **the lunches read back on Olga's claim.** `ada` (role company.owner) calls and sends id the last call's expense, and gets back [the world's expenseClaim, `2026-11-19`, the world's expenseClaimType, `30000000`, `30000000`, `active`].
- **the 4 USDC line reads back on the third claim.** `ada` (role company.owner) calls and sends id the last call's expense, and gets back [`2026-12-03`, `4000000`, `4000000`].

## How to call

```sh
capxul expense get --id <id>
```

HTTP: `POST /expense/get` with the payload as JSON. SDK: `Sdk.expense.get(payload)`.
