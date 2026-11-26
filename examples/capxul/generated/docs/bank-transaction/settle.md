<!-- Generated from the blueprint. Do not edit. -->
# bank-transaction.settle

Record that Bridge paid a transfer out.

**Who may call:** the system.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| transaction | bank-transaction.id |

## Answer

| field | value |
|---|---|
| transaction | bank-transaction.id |

## Move

`settle`: from pending to settled, emitting TransferSettled.

## Steps

- `bank-transaction.settle.update` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| AlreadyRecorded | 44 | BT-004 | another bank transaction holds this reference; by the rule bank-transaction.oneTransactionPerMovement, carrying reference |
| BankTransactionNotPending | 40 | BT-900 | the bank-transaction is in a state settle can't start from; carries `state` |
| BankTransactionNotFound | 4 | BT-901 | nothing has the id in transaction; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the system; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### bridge: a bank account, end to end

Starts from an empty world.

- **Bridge reports it paid.** `bridge` (system) calls and sends transaction the last call's transaction, and is answered.

### bridge: a transfer is paid or returned

Starts from the world `a transfer sent`.

- **Ada can't say it was paid.** `ada` (role company.owner) calls and sends transaction the world's transfer, and is refused with NotAllowed, AR-001.
- **a transfer that failed can't then be paid.** `bridge` (system) calls and sends transaction the last call's transaction, and is refused with BankTransactionNotPending, BT-900, carrying state `failed`.
- **Bridge reports the rent paid.** `bridge` (system) calls and sends transaction the world's transfer, and gets back the world's transfer.
- **it is paid once.** `bridge` (system) calls and sends transaction the world's transfer, and is refused with BankTransactionNotPending, BT-900, carrying state `settled`.

## How to call

```sh
capxul bank-transaction settle --transaction <transaction>
```

HTTP: `POST /bank-transaction/settle` with the payload as JSON. SDK: `Sdk.bank-transaction.settle(payload)`.
