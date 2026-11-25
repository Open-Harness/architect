<!-- Generated from the blueprint. Do not edit. -->
# bank-transaction.get

Read one bank-transaction by its id: company, account, date, deposit, withdrawal, currency, reference, party, state.

**Who may call:** the owner of its company.

**A read:** answered from the records, with no handler.

**Budget:** p95 50ms.

## Payload

| field | value |
|---|---|
| id | bank-transaction.id |

## Answer

| field | value | description |
|---|---|---|
| company | bank-transaction.company |  |
| account | bank-transaction.account | The company's bank account the money moved on. |
| date | bank-transaction.date | The day the money moved, as Bridge dates it. |
| deposit | bank-transaction.deposit | What came in, in USDC base units; 0 for a transfer out. |
| withdrawal | bank-transaction.withdrawal | What went out, in USDC base units; 0 for a deposit. |
| currency | bank-transaction.currency | The bank account's currency, which the money moved in at the bank. |
| reference | bank-transaction.reference | Bridge's id for the movement: the deposit's, or the transfer's. |
| party | bank-transaction.party | Who sent the deposit, or the external account the transfer pays. |
| state | text |  |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its company; the handler never runs |

## Worked examples

### bridge: a bank account, end to end

Starts from an empty world.

- **Ada reads the deposit back.** `ada` (signed in) calls and sends id the last call's transaction, and gets back [`2026-11-30`, `500000000`, `0`, `USD`, `dep_first01`, `First Customer`, `settled`].
- **Ada reads the transfer back paid.** `ada` (signed in) calls and sends id the last call's transaction, and gets back [`2026-12-01`, `0`, `120750000`, `USD`, `ea_supplier`, `settled`].

### bridge: a deposit lands

Starts from the world `two bank accounts`.

- **Bo can't read it.** `bo` (signed in) calls and sends id the last call's transaction, and is refused with NotAllowed, AR-001.
- **Ada reads it back: a deposit on Operating, in its currency, and nothing withdrawn.** `ada` (role company.owner) calls and sends id the last call's transaction, and gets back [the world's company, the world's account, `2026-11-30`, `1250500000`, `0`, `USD`, `dep_8f2c41a7`, `Jane Payer`, `settled`].
- **it reads back as the smallest deposit, not the one before it.** `ada` (role company.owner) calls and sends id the last call's transaction, and gets back [`dep_micro01`, `1`, `Bridge test`].
- **it reads back on Payroll, in euros at the bank.** `ada` (role company.owner) calls and sends id the last call's transaction, and gets back [the world's company, the world's payroll, `2026-12-01`, `1234567891`, `0`, `EUR`, `dep_eur0001`, `Rhein GmbH`, `settled`].

### bridge: a transfer is paid or returned

Starts from the world `a transfer sent`.

- **Ada reads it back pending, with the reference she was given.** `ada` (role company.owner) calls and sends id the world's transfer, and gets back [the world's company, the world's account, `2026-12-01`, `0`, `300250000`, `USD`, the world's transferReference, `ea_landlord`, `pending`].
- **it reads back failed, nothing else changed.** `ada` (role company.owner) calls and sends id the last call's transaction, and gets back [the world's company, the world's account, `2026-12-01`, `0`, `950000000`, `USD`, `ea_old_tenant`, `failed`].
- **it is dated that day in UTC, not the next.** `ada` (role company.owner) calls and sends id the last call's transaction, and gets back [`2026-12-01`, `ea_late`].
- **it is dated the new day, not the one before.** `ada` (role company.owner) calls and sends id the last call's transaction, and gets back [`2026-12-02`, `ea_early`].
- **it reads back paid, still dated the day it was sent, nothing else changed.** `ada` (role company.owner) calls and sends id the world's transfer, and gets back [the world's company, the world's account, `2026-12-01`, `0`, `300250000`, `USD`, the world's transferReference, `ea_landlord`, `settled`].

### bridge: each company's money is its own

Starts from the world `two companies' accounts`.

- **Bo can't read it.** `bo` (role company.owner) calls and sends id the last call's transaction, and is refused with NotAllowed, AR-001.
- **Ada reads it back as Acme Trading's.** `ada` (role company.owner) calls and sends id the last call's transaction, and gets back [the world's company, the world's account, `40000000`, `dep_acme01`].
- **Bo can't read Ada's transfer.** `bo` (role company.owner) calls and sends id the last call's transaction, and is refused with NotAllowed, AR-001.
- **Ada reads it back as Acme Trading's.** `ada` (role company.owner) calls and sends id the last call's transaction, and gets back [the world's company, the world's account, `15000000`, `ea_acme_supplier`].
- **Ada can't read Bo's deposit.** `ada` (role company.owner) calls and sends id the last call's transaction, and is refused with NotAllowed, AR-001.
- **Bo reads it back on his account.** `bo` (role company.owner) calls and sends id the last call's transaction, and gets back [the world's boAccount, `7000000`, `dep_bo01`].

### bridge: send money out

Starts from the world `a reopened account`.

- **Bo can't read it.** `bo` (signed in) calls and sends id the last call's transaction, and is refused with NotAllowed, AR-001.
- **it reads back pending on Payroll, in euros at the bank.** `ada` (role company.owner) calls and sends id the last call's transaction, and gets back [the world's company, the world's payroll, `0`, `1000001`, `EUR`, `ea_rhein_supplier`, `pending`].

## How to call

```sh
capxul bank-transaction get --id <id>
```

HTTP: `POST /bank-transaction/get` with the payload as JSON. SDK: `Sdk.bank-transaction.get(payload)`.
