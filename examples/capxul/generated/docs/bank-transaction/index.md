<!-- Generated from the blueprint. Do not edit. -->
# bank-transaction

One movement of money on a company's bank account: a deposit Bridge landed, or a transfer out.

Lives in the database.

## Fields

| field | value | description |
|---|---|---|
| id | id |  |
| company | company.id |  |
| account | bank-account.id | The company's bank account the money moved on. |
| date | Day | The day the money moved, as Bridge dates it. |
| deposit | Amount | What came in, in USDC base units; 0 for a transfer out. |
| withdrawal | Amount | What went out, in USDC base units; 0 for a deposit. |
| currency | AccountCurrency | The bank account's currency, which the money moved in at the bank. |
| reference | BridgeRef | Bridge's id for the movement: the deposit's, or the transfer's. |
| party | Party | Who sent the deposit, or the external account the transfer pays. |

## Machine

States: pending, settled, failed. A move from the wrong state is refused BankTransactionNotPending (exit 40).

| move | from | to | emits |
|---|---|---|---|
| land | (creates) | settled | DepositLanded |
| send | (creates) | pending | TransferSent |
| settle | pending | settled | TransferSettled |
| fail | pending | failed | TransferFailed |

## Invariants

- `bank-transaction.oneTransactionPerMovement`: another bank transaction holds this reference. Unique on reference, in every state; refused AlreadyRecorded.

## Events

- `DepositLanded`: carries transaction (bank-transaction.id), account (bank-transaction.account: The company's bank account the money moved on.), deposit (bank-transaction.deposit: What came in, in USDC base units; 0 for a transfer out.), reference (bank-transaction.reference: Bridge's id for the movement: the deposit's, or the transfer's.); emitted by the move land
- `TransferFailed`: carries transaction (bank-transaction.id), state (TransferFailure); emitted by the move fail
- `TransferSent`: carries transaction (bank-transaction.id), account (bank-transaction.account: The company's bank account the money moved on.), withdrawal (bank-transaction.withdrawal: What went out, in USDC base units; 0 for a deposit.); emitted by the move send
- `TransferSettled`: carries transaction (bank-transaction.id); emitted by the move settle

## Operations

- [bank-transaction.fail](fail.md): Record that Bridge couldn't pay a transfer out, and how it ended.
- [bank-transaction.get](get.md): Read one bank-transaction by its id: company, account, date, deposit, withdrawal, currency, reference, party, state.
- [bank-transaction.land](land.md): Record a deposit Bridge landed on a company's bank account.
- [bank-transaction.list](list.md): List bank-transactions, oldest first, 50 to a page, filtered by account.
- [bank-transaction.send](send.md): Send money out of a company's bank account to a payee, through Bridge.
- [bank-transaction.settle](settle.md): Record that Bridge paid a transfer out.
