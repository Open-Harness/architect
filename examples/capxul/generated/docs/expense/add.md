<!-- Generated from the blueprint. Do not edit. -->
# expense.add

Add one expense to a claim still in draft.

**Who may call:** the owner of its expenseClaim.company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 200ms.

## Payload

| field | value |
|---|---|
| expenseClaim | expense.expenseClaim |
| expenseDate | expense.expenseDate |
| expenseType | expense.expenseType |
| amount | expense.amount |
| sanctionedAmount | expense.sanctionedAmount |

## Answer

| field | value |
|---|---|
| expense | expense.id |
| totalClaimedAmount | expense-claim.totalClaimedAmount |
| totalSanctionedAmount | expense-claim.totalSanctionedAmount |

## Move

`add`: from nothing (it creates) to active, emitting ExpenseAdded.

## Steps

- `expense.add.load` (database)
- `expense.add.insert` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| SanctionedOverClaimed | 41 | EX-001 | declared in errors.ts, carrying amount |
| ExpenseTypeNotInCompany | 42 | EX-002 | declared in errors.ts |
| ClaimNotDraft | 43 | EX-003 | declared in errors.ts |
| ExpenseClaimTypeNotFound | 4 | ET-901 | nothing has the id in expenseType; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its expenseClaim.company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### claim expenses

Starts from the world `an expense claim with two types`.

- **Ada can't sanction more than was spent.** `ada` (role company.owner) calls and sends expenseClaim the world's expenseClaim, expenseDate `2026-11-18`, expenseType the world's expenseClaimType, amount `45000000`, sanctionedAmount `45000001`, and is refused with SanctionedOverClaimed, EX-001, carrying amount `45000000`.
- **Ada adds a 45 USDC taxi, sanctioned in full.** `ada` (role company.owner) calls and sends expenseClaim the world's expenseClaim, expenseDate `2026-11-18`, expenseType the world's expenseClaimType, amount `45000000`, sanctionedAmount `45000000`, and gets back [`45000000`, `45000000`] and gets back an answer matching `^exp_[0-9a-z]+$`.
- **Ada adds a 120.500001 USDC hotel as Lodging, sanctioning 100.000001 USDC of it.** `ada` (role company.owner) calls and sends expenseClaim the world's expenseClaim, expenseDate `2026-11-19`, expenseType the world's lodging, amount `120500001`, sanctionedAmount `100000001`, and gets back [`165500001`, `145000001`].
- **a line is judged on its own amounts, not the claim's: 12 USDC can't be sanctioned on a 10.500001 USDC lunch.** `ada` (role company.owner) calls and sends expenseClaim the world's expenseClaim, expenseDate `2026-11-19`, expenseType the world's expenseClaimType, amount `10500001`, sanctionedAmount `12000000`, and is refused with SanctionedOverClaimed, EX-001, carrying amount `10500001`.
- **an approved claim takes no more expenses.** `ada` (role company.owner) calls and sends expenseClaim the world's expenseClaim, expenseDate `2026-11-19`, expenseType the world's expenseClaimType, amount `1000000`, sanctionedAmount `2000000`, and is refused with ClaimNotDraft, EX-003.
- **Ada adds a line of 2^53 + 1 base units, sanctioned in full: totals are exact, not floating point.** `ada` (role company.owner) calls and sends expenseClaim the last call's expenseClaim, expenseDate `2026-11-22`, expenseType the world's expenseClaimType, amount `9007199254740993`, sanctionedAmount `9007199254740993`, and gets back [`9007199254740993`, `9007199254740993`].

### expense claims stay in their company

Starts from the world `an expense claim`.

- **Ada can't put Bo's expense type on Olga's claim, even over-sanctioned.** `ada` (role company.owner) calls and sends expenseClaim the world's expenseClaim, expenseDate `2026-11-19`, expenseType the last call's expenseClaimType, amount `5000000`, sanctionedAmount `6000000`, and is refused with ExpenseTypeNotInCompany, EX-002.
- **Ada adds one base unit Olga spent before leaving, sanctioning none of it.** `ada` (role company.owner) calls and sends expenseClaim the world's expenseClaim, expenseDate `2026-11-19`, expenseType the world's expenseClaimType, amount `1`, sanctionedAmount `0`, and gets back [`1`, `0`].
- **the approved claim takes no line, not even one with Bo's type, over-sanctioned.** `ada` (role company.owner) calls and sends expenseClaim the world's expenseClaim, expenseDate `2026-11-19`, expenseType the last call's expenseClaimType, amount `1000000`, sanctionedAmount `2000000`, and is refused with ClaimNotDraft, EX-003.

### reject an expense claim

Starts from the world `an expense claim`.

- **Ada adds 30 USDC of lunches.** `ada` (role company.owner) calls and sends expenseClaim the world's expenseClaim, expenseDate `2026-11-19`, expenseType the world's expenseClaimType, amount `30000000`, sanctionedAmount `30000000`, and gets back [`30000000`, `30000000`].
- **a rejected claim takes no more expenses, not even an over-sanctioned one.** `ada` (role company.owner) calls and sends expenseClaim the world's expenseClaim, expenseDate `2026-11-19`, expenseType the world's expenseClaimType, amount `1000000`, sanctionedAmount `2000000`, and is refused with ClaimNotDraft, EX-003.
- **Ada adds 4 USDC of lunches to it, sanctioning 3.** `ada` (role company.owner) calls and sends expenseClaim the last call's expenseClaim, expenseDate `2026-12-03`, expenseType the world's expenseClaimType, amount `4000000`, sanctionedAmount `3000000`, and gets back [`4000000`, `3000000`].

## How to call

```sh
capxul expense add --expenseClaim <expenseClaim> --expenseDate <expenseDate> --expenseType <expenseType> --amount <amount> --sanctionedAmount <sanctionedAmount>
```

HTTP: `POST /expense/add` with the payload as JSON. SDK: `Sdk.expense.add(payload)`.
