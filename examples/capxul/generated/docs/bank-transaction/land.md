<!-- Generated from the blueprint. Do not edit. -->
# bank-transaction.land

Record a deposit Bridge landed on a company's bank account.

**Who may call:** the system.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

| field | value | description |
|---|---|---|
| account | bank-transaction.account | The company's bank account the money moved on. |
| reference | bank-transaction.reference | Bridge's id for the movement: the deposit's, or the transfer's. |
| amount | Dollars | What landed, as Bridge writes it: dollars, at most six places. |
| party | bank-transaction.party | Who sent the deposit, or the external account the transfer pays. |
| date | bank-transaction.date | The day the money moved, as Bridge dates it. |

## Answer

| field | value |
|---|---|
| transaction | bank-transaction.id |

## Move

`land`: from nothing (it creates) to settled, emitting DepositLanded.

## Steps

- `bank-transaction.land.load` (database)
- `bank-transaction.land.insert` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| AlreadyRecorded | 44 | BT-004 | another bank transaction holds this reference; by the rule bank-transaction.oneTransactionPerMovement, carrying reference |
| BankAccountNotFound | 4 | BA-901 | nothing has the id in account; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the system; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### bridge: a bank account, end to end

Starts from an empty world.

- **Bridge lands a deposit on it.** `bridge` (system) calls and sends account the last call's account, reference `dep_first01`, amount { value: `500`, scale: 0 }, party `First Customer`, date `2026-11-30`, and is answered.

### bridge: a deposit lands

Starts from the world `two bank accounts`.

- **Ada can't report a deposit herself: only Bridge does.** `ada` (role company.owner) calls and sends account the world's account, reference `dep_ada01`, amount { value: `10`, scale: 0 }, party `Ada Lovelace`, date `2026-11-30`, and is refused with NotAllowed, AR-001.
- **Bridge lands a deposit of 1,250.50 dollars on Operating.** `bridge` (system) calls and sends account the world's account, reference `dep_8f2c41a7`, amount { value: `12505`, scale: 1 }, party `Jane Payer`, date `2026-11-30`, and gets back an answer matching `^btx_[0-9a-z]+$`.
- **Bridge reports the same deposit again, and it is recorded once.** `bridge` (system) calls and sends account the world's account, reference `dep_8f2c41a7`, amount { value: `12505`, scale: 1 }, party `Jane Payer`, date `2026-11-30`, and is refused with AlreadyRecorded, BT-004, carrying reference `dep_8f2c41a7`.
- **a later report of that deposit, a day on, is the same deposit.** `bridge` (system) calls and sends account the world's account, reference `dep_8f2c41a7`, amount { value: `125050`, scale: 2 }, party `Jane Payer`, date `2026-12-01`, and is refused with AlreadyRecorded, BT-004, carrying reference `dep_8f2c41a7`.
- **Bridge lands the smallest deposit there is, one millionth of a dollar.** `bridge` (system) calls and sends account the world's account, reference `dep_micro01`, amount { value: `1`, scale: 6 }, party `Bridge test`, date `2026-12-01`, and is answered.
- **1.005 dollars is exactly 1005000, not a float's 1004999.** `bridge` (system) calls and sends account the world's account, reference `dep_half_cent`, amount { value: `1005`, scale: 3 }, party `Jane Payer`, date `2026-12-01`, and is answered.
- **a deposit past a float's whole numbers is exact to the millionth.** `bridge` (system) calls and sends account the world's account, reference `dep_large01`, amount { value: `9007199254740993`, scale: 6 }, party `Big Payer`, date `2026-12-01`, and is answered.
- **Bridge lands a deposit on Payroll with all six places.** `bridge` (system) calls and sends account the world's payroll, reference `dep_eur0001`, amount { value: `1234567891`, scale: 6 }, party `Rhein GmbH`, date `2026-12-01`, and is answered.

### bridge: each company's money is its own

Starts from the world `two companies' accounts`.

- **Bridge lands a deposit on Acme Trading's account.** `bridge` (system) calls and sends account the world's account, reference `dep_acme01`, amount { value: `40`, scale: 0 }, party `Acme Customer`, date `2026-11-30`, and gets back an answer matching `^btx_[0-9a-z]+$`.
- **Bridge lands a deposit on Bo's account.** `bridge` (system) calls and sends account the world's boAccount, reference `dep_bo01`, amount { value: `7`, scale: 0 }, party `Bo Customer`, date `2026-11-30`, and gets back an answer matching `^btx_[0-9a-z]+$`.

## How to call

```sh
capxul bank-transaction land --account <account> --reference <reference> --amount <amount> --party <party> --date <date>
```

HTTP: `POST /bank-transaction/land` with the payload as JSON. SDK: `Sdk.bank-transaction.land(payload)`.
