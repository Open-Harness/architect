<!-- Generated from the blueprint. Do not edit. -->
# account.make-ledger

Turn a group account with nothing under it into a ledger.

**Who may call:** the owner of its account.company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| account | account.id |

## Answer

| field | value |
|---|---|
| account | account.id |

## Move

`makeLedger`: from group to ledger, emitting AccountMadeLedger.

## Steps

- `account.make-ledger.load` (database)
- `account.make-ledger.update` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| AccountHasChildren | 46 | AC-006 | declared in errors.ts |
| AccountNameTaken | 47 | AC-007 | another account holds this company and account name; by the rule account.oneNamePerCompany |
| AccountNotGroup | 40 | AC-900 | the account is in a state makeLedger can't start from; carries `state` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its account.company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### set up a chart of accounts

Starts from the world `a chart`.

- **Ada can't turn the group above Rent into a ledger while Rent is under it.** `ada` (role company.owner) calls and sends account the world's operating, and is refused with AccountHasChildren, AC-006.
- **nor Expenses, with that group under it.** `ada` (role company.owner) calls and sends account the world's expenses, and is refused with AccountHasChildren, AC-006.
- **nor Assets.** `ada` (role company.owner) calls and sends account the world's assets, and is refused with AccountHasChildren, AC-006.
- **a ledger is already one.** `ada` (role company.owner) calls and sends account the world's bank, and is refused with AccountNotGroup, AC-900, carrying state `ledger`.
- **Bo can't turn it into a ledger.** `bo` (signed in) calls and sends account the last call's account, and is refused with NotAllowed, AR-001.
- **Ada turns it into a ledger: nothing is under it.** `ada` (role company.owner) calls and sends account the last call's account, and gets back an answer matching `^acc_`.

## How to call

```sh
capxul account make-ledger --account <account>
```

HTTP: `POST /account/make-ledger` with the payload as JSON. SDK: `Sdk.account.make-ledger(payload)`.
