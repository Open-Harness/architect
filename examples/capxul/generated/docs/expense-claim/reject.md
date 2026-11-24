<!-- Generated from the blueprint. Do not edit. -->
# expense-claim.reject

Reject a claim, so nothing of it is paid back.

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

## Move

`reject`: from draft to rejected, emitting ExpenseClaimRejected.

## Steps

- `expense-claim.reject.update` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| ExpenseClaimNotDraft | 40 | EC-900 | the expense-claim is in a state reject can't start from; carries `state` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its expenseClaim.company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### reject an expense claim

Starts from the world `an expense claim`.

- **Olga can't reject her own claim.** `olga` (signed in) calls and sends expenseClaim the world's expenseClaim, and is refused with NotAllowed, AR-001.
- **Ada rejects it.** `ada` (role company.owner) calls and sends expenseClaim the world's expenseClaim, and gets back the world's expenseClaim.
- **Ada rejects that one too, with nothing on it.** `ada` (role company.owner) calls and sends expenseClaim the last call's expenseClaim, and gets back the last call's expenseClaim.
- **Ada rejects the third claim.** `ada` (role company.owner) calls and sends expenseClaim the last call's expenseClaim, and gets back the last call's expenseClaim.

## How to call

```sh
capxul expense-claim reject --expenseClaim <expenseClaim>
```

HTTP: `POST /expense-claim/reject` with the payload as JSON. SDK: `Sdk.expense-claim.reject(payload)`.
