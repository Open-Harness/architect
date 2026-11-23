<!-- Generated from the blueprint. Do not edit. -->
# bank-account.close

Close a company's bank account; it takes no more deposits.

**Who may call:** the owner of its account.company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 800ms.

## Payload

| field | value |
|---|---|
| account | bank-account.id |

## Answer

| field | value |
|---|---|
| account | bank-account.id |

## Move

`close`: from open to closed, emitting BankAccountClosed.

## Steps

- `bank-account.close.update` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| BankAccountNotOpen | 40 | BA-900 | the bank-account is in a state close can't start from; carries `state` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its account.company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### bridge: a bank account closes

Starts from the world `a bank account`.

- **Bo can't close it.** `bo` (signed in) calls and sends account the world's account, and is refused with NotAllowed, AR-001.
- **Ada closes it.** `ada` (role company.owner) calls and sends account the world's account, and gets back the world's account.
- **it can't be closed twice.** `ada` (role company.owner) calls and sends account the world's account, and is refused with BankAccountNotOpen, BA-900, carrying state `closed`.

## How to call

```sh
capxul bank-account close --account <account>
```

HTTP: `POST /bank-account/close` with the payload as JSON. SDK: `Sdk.bank-account.close(payload)`.
