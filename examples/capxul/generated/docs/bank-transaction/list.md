<!-- Generated from the blueprint. Do not edit. -->
# bank-transaction.list

List bank-transactions, oldest first, 50 to a page, filtered by account.

**Who may call:** the owner of its account.company.

**A read:** answered from the records, with no handler. A page of 50 at a time, oldest first, narrowed by account; pass the answer's `next` as `cursor` for the page after it.

**Budget:** p95 80ms.

## Payload

| field | value | description |
|---|---|---|
| account (optional) | bank-transaction.account | The company's bank account the money moved on. |
| cursor (optional) | text |  |

## Answer

| field | value |
|---|---|
| items | schema |
| next | schema |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its account.company; the handler never runs |

## Worked examples

### bridge: a bank account, end to end

Starts from an empty world.

- **the account holds the deposit and the transfer, each once, oldest first.** `ada` (signed in) calls and sends account the last call's account, and gets back [[`500000000`, `0`, `USD`, `First Customer`, `settled`], [`0`, `120750000`, `USD`, `ea_supplier`, `settled`]].

### bridge: a deposit lands

Starts from the world `two bank accounts`.

- **Operating holds exactly its four deposits, oldest first: the reports made no fifth.** `ada` (role company.owner) calls and sends account the world's account, and gets back [[`dep_8f2c41a7`, `1250500000`, `0`, the world's account, `settled`], [`dep_micro01`, `1`, `0`, the world's account, `settled`], [`dep_half_cent`, `1005000`, `0`, the world's account, `settled`], [`dep_large01`, `9007199254740993`, `0`, the world's account, `settled`]].
- **Payroll holds only its own.** `ada` (role company.owner) calls and sends account the world's payroll, and gets back [[`dep_eur0001`, `1234567891`]].
- **Bo can't list Ada's account.** `bo` (signed in) calls and sends account the world's account, and is refused with NotAllowed, AR-001.

### bridge: a transfer is paid or returned

Starts from the world `a transfer sent`.

- **the account holds the five transfers, each once, oldest first: paying one left the others as they were.** `ada` (role company.owner) calls and sends account the world's account, and gets back [[`300250000`, `ea_landlord`, `settled`], [`950000000`, `ea_old_tenant`, `failed`], [`80000000`, `ea_cleaner`, `pending`], [`5000000`, `ea_late`, `pending`], [`6000000`, `ea_early`, `pending`]] and gets back the world's transferReference and gets back 5.
- **Payroll holds none of them.** `ada` (role company.owner) calls and sends account the world's payroll, and gets back 0.
- **Bo can't read the account's transactions.** `bo` (signed in) calls and sends account the world's account, and is refused with NotAllowed, AR-001.

### bridge: send money out

Starts from the world `a reopened account`.

- **the account holds the two transfers, oldest first, each once, each with its own reference.** `ada` (role company.owner) calls and sends account the world's account, and gets back [[`300250000`, `0`, `USD`, `ea_landlord`, `pending`], [`300250000`, `0`, `USD`, `ea_landlord`, `pending`]] and gets back 2.

## How to call

```sh
capxul bank-transaction list [--account <account>] [--cursor <cursor>]
```

HTTP: `POST /bank-transaction/list` with the payload as JSON. SDK: `Sdk.bank-transaction.list(payload)`.
