<!-- Generated from the blueprint. Do not edit. -->
# expense-claim.approve

Approve a claim, owing the employee what was sanctioned.

**Who may call:** the owner of its expenseClaim.company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| expenseClaim | expense-claim.id |

## Answer

| field | value |
|---|---|
| expenseClaim | expense-claim.id |
| totalSanctionedAmount | expense-claim.totalSanctionedAmount |

## Move

`approve`: from draft to approved, emitting ExpenseClaimApproved.

## Steps

- `expense-claim.approve.load` (database)
- `expense-claim.approve.update` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| ClaimHasNoExpenses | 43 | EC-003 | declared in errors.ts |
| ExpenseClaimNotDraft | 40 | EC-900 | the expense-claim is in a state approve can't start from; carries `state` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its expenseClaim.company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### claim expenses

Starts from the world `an expense claim`.

- **Olga can't approve her own claim.** `olga` (signed in) calls and sends expenseClaim the world's expenseClaim, and is refused with NotAllowed, AR-001.
- **Ada approves it, owing Olga 145 USDC.** `ada` (role company.owner) calls and sends expenseClaim the world's expenseClaim, and gets back [the world's expenseClaim, `145000000`].
- **nor is it approved twice.** `ada` (role company.owner) calls and sends expenseClaim the world's expenseClaim, and is refused with ExpenseClaimNotDraft, EC-900, carrying state `approved`.

### reject an expense claim

Starts from the world `an expense claim`.

- **a claim with no expenses can't be approved.** `ada` (role company.owner) calls and sends expenseClaim the world's expenseClaim, and is refused with ClaimHasNoExpenses, EC-003.
- **nor can it then be approved.** `ada` (role company.owner) calls and sends expenseClaim the world's expenseClaim, and is refused with ExpenseClaimNotDraft, EC-900, carrying state `rejected`.

## How to call

```sh
capxul expense-claim approve --expenseClaim <expenseClaim>
```

HTTP: `POST /expense-claim/approve` with the payload as JSON. SDK: `Sdk.expense-claim.approve(payload)`.
