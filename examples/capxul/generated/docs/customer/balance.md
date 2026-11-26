<!-- Generated from the blueprint. Do not edit. -->
# customer.balance

A customer's balance on a day, from the ledger lines posted with it as their party.

**Who may call:** the owner of its customer.company.

**Budget:** p95 300ms.

## Payload

| field | value | description |
|---|---|---|
| customer | customer.id |  |
| onDay | Day | The last day counted: lines posted on it count. |

## Answer

| field | value |
|---|---|
| customer | customer.id |
| debit | Amount |
| credit | Amount |
| balance | Balance |

## Steps

- `customer.balance.sum` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its customer.company; the handler never runs |

## Worked examples

### add customers and suppliers

Starts from the world `an outside supplier`.

- **a new customer's balance is nothing.** `ada` (role company.owner) calls and sends customer the world's customer, onDay `2026-12-31`, and gets back [`0`, `0`, `0`] and gets back the world's customer.
- **Bo can't read it.** `bo` (signed in) calls and sends customer the world's customer, onDay `2026-12-31`, and is refused with NotAllowed, AR-001.

### draft a payment entry

Starts from the world `an outside supplier`.

- **and Kibo Stores' balance is nothing.** `ada` (role company.owner) calls and sends customer the world's customer, onDay `2026-12-31`, and gets back [`0`, `0`, `0`].

### post a payment entry

Starts from the world `a received advance`.

- **Kibo Stores' balance is the advance received, negative.** `ada` (role company.owner) calls and sends customer the world's customer, onDay `2026-12-31`, and gets back [`0`, `500000000`, `-500000000`] and gets back the world's customer.
- **on the payment's own day too.** `ada` (role company.owner) calls and sends customer the world's customer, onDay `2026-02-10`, and gets back [`0`, `500000000`, `-500000000`].
- **but not the day before.** `ada` (role company.owner) calls and sends customer the world's customer, onDay `2026-02-09`, and gets back [`0`, `0`, `0`].
- **Bo can't read Kibo Stores' balance.** `bo` (signed in) calls and sends customer the world's customer, onDay `2026-12-31`, and is refused with NotAllowed, AR-001.
- **Kibo Stores' balance is nothing again.** `ada` (role company.owner) calls and sends customer the world's customer, onDay `2026-12-31`, and gets back [`0`, `0`, `0`].
- **Kibo Stores' balance doesn't move.** `ada` (role company.owner) calls and sends customer the world's customer, onDay `2026-12-31`, and gets back [`0`, `0`, `0`].
- **Kibo Stores' balance is 100 USDC owed, positive.** `ada` (role company.owner) calls and sends customer the world's customer, onDay `2026-12-31`, and gets back [`100000000`, `0`, `100000000`].
- **and nothing on 31 March.** `ada` (role company.owner) calls and sends customer the world's customer, onDay `2026-03-31`, and gets back [`0`, `0`, `0`].
- **the first Kibo Stores' balance doesn't move.** `ada` (role company.owner) calls and sends customer the world's customer, onDay `2026-12-31`, and gets back [`100000000`, `0`, `100000000`].
- **Kibo Stores' balance counts both base units, and none of the refused.** `ada` (role company.owner) calls and sends customer the world's customer, onDay `2027-12-31`, and gets back [`100000000`, `2`, `99999998`].

## How to call

```sh
capxul customer balance --customer <customer> --onDay <onDay>
```

HTTP: `POST /customer/balance` with the payload as JSON. SDK: `Sdk.customer.balance(payload)`.
