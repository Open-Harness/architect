<!-- Generated from the blueprint. Do not edit. -->
# supplier.balance

A supplier's balance on a day, from the ledger lines posted with it as their party.

**Who may call:** the owner of its supplier.company.

**Budget:** p95 300ms.

## Payload

| field | value | description |
|---|---|---|
| supplier | supplier.id |  |
| onDay | Day | The last day counted: lines posted on it count. |

## Answer

| field | value |
|---|---|
| supplier | supplier.id |
| debit | Amount |
| credit | Amount |
| balance | Balance |

## Steps

- `supplier.balance.sum` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its supplier.company; the handler never runs |

## Worked examples

### add customers and suppliers

Starts from the world `an outside supplier`.

- **a new supplier's balance is nothing.** `ada` (role company.owner) calls and sends supplier the world's supplier, onDay `2026-12-31`, and gets back [`0`, `0`, `0`] and gets back the world's supplier.
- **Bo can't read it.** `bo` (signed in) calls and sends supplier the world's supplier, onDay `2026-12-31`, and is refused with NotAllowed, AR-001.

### post a payment entry

Starts from the world `a received advance`.

- **Mara Office Rentals, paid nothing, has no balance.** `ada` (role company.owner) calls and sends supplier the world's supplier, onDay `2026-12-31`, and gets back [`0`, `0`, `0`].
- **Mara Office Rentals' balance is the advance paid, positive.** `ada` (role company.owner) calls and sends supplier the world's supplier, onDay `2026-12-31`, and gets back [`200000000`, `0`, `200000000`] and gets back the world's supplier.
- **Bo can't read Mara Office Rentals' balance.** `bo` (signed in) calls and sends supplier the world's supplier, onDay `2026-12-31`, and is refused with NotAllowed, AR-001.
- **Mara Office Rentals' balance is 150 USDC.** `ada` (role company.owner) calls and sends supplier the world's supplier, onDay `2026-12-31`, and gets back [`200000000`, `50000000`, `150000000`].
- **but 200 USDC the day before the refund.** `ada` (role company.owner) calls and sends supplier the world's supplier, onDay `2026-03-19`, and gets back [`200000000`, `0`, `200000000`].
- **and Mara Office Rentals' balance is still 150 USDC.** `ada` (role company.owner) calls and sends supplier the world's supplier, onDay `2026-12-31`, and gets back [`200000000`, `50000000`, `150000000`].
- **a disabled supplier's balance still reads from the ledger.** `ada` (role company.owner) calls and sends supplier the world's supplier, onDay `2026-12-31`, and gets back [`200000000`, `50000000`, `150000000`].
- **and Mara Office Rentals' balance takes it.** `ada` (role company.owner) calls and sends supplier the world's supplier, onDay `2026-12-31`, and gets back [`230000000`, `50000000`, `180000000`].
- **the first supplier's balance doesn't move.** `ada` (role company.owner) calls and sends supplier the world's supplier, onDay `2026-12-31`, and gets back [`230000000`, `50000000`, `180000000`].

## How to call

```sh
capxul supplier balance --supplier <supplier> --onDay <onDay>
```

HTTP: `POST /supplier/balance` with the payload as JSON. SDK: `Sdk.supplier.balance(payload)`.
