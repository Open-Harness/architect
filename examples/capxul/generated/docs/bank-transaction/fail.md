<!-- Generated from the blueprint. Do not edit. -->
# bank-transaction.fail

Record that Bridge couldn't pay a transfer out, and how it ended.

**Who may call:** the system.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| transaction | bank-transaction.id |
| state | TransferFailure |

## Answer

| field | value |
|---|---|
| transaction | bank-transaction.id |

## Move

`fail`: from pending to failed, emitting TransferFailed.

## Steps

- `bank-transaction.fail.update` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| AlreadyRecorded | 44 | BT-004 | another bank transaction holds this reference; by the rule bank-transaction.oneTransactionPerMovement, carrying reference |
| BankTransactionNotPending | 40 | BT-900 | the bank-transaction is in a state fail can't start from; carries `state` |
| BankTransactionNotFound | 4 | BT-901 | nothing has the id in transaction; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the system; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### bridge: a transfer is paid or returned

Starts from the world `a transfer sent`.

- **nor that it came back.** `ada` (role company.owner) calls and sends transaction the world's transfer, state `returned`, and is refused with NotAllowed, AR-001.
- **Bridge reports it couldn't be delivered, and the rent is still pending.** `bridge` (system) calls and sends transaction the last call's transaction, state `undeliverable`, and gets back the last call's transaction.
- **nor fail twice.** `bridge` (system) calls and sends transaction the last call's transaction, state `returned`, and is refused with BankTransactionNotPending, BT-900, carrying state `failed`.
- **and once paid it can't come back.** `bridge` (system) calls and sends transaction the world's transfer, state `returned`, and is refused with BankTransactionNotPending, BT-900, carrying state `settled`.

## How to call

```sh
capxul bank-transaction fail --transaction <transaction> --state <state>
```

HTTP: `POST /bank-transaction/fail` with the payload as JSON. SDK: `Sdk.bank-transaction.fail(payload)`.
