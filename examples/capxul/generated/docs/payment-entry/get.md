<!-- Generated from the blueprint. Do not edit. -->
# payment-entry.get

Read one payment-entry by its id: company, paymentType, postingDate, partyType, party, paidFrom, paidTo, paidAmount, costCenter, state.

**Who may call:** the owner of its company.

**A read:** answered from the records, with no handler.

**Budget:** p95 50ms.

## Payload

| field | value |
|---|---|
| id | payment-entry.id |

## Answer

| field | value |
|---|---|
| company | payment-entry.company |
| paymentType | payment-entry.paymentType |
| postingDate | payment-entry.postingDate |
| partyType | payment-entry.partyType |
| party | payment-entry.party |
| paidFrom | payment-entry.paidFrom |
| paidTo | payment-entry.paidTo |
| paidAmount | payment-entry.paidAmount |
| costCenter | payment-entry.costCenter |
| state | text |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its company; the handler never runs |

## Worked examples

### draft a payment entry

Starts from the world `an outside supplier`.

- **Bo can't read it.** `bo` (signed in) calls and sends id the last call's paymentEntry, and is refused with NotAllowed, AR-001.
- **it reads back a draft, as she typed it.** `ada` (role company.owner) calls and sends id the last call's paymentEntry, and gets back [the world's company, `Receive`, `2026-02-10`, `Customer`, the world's customer, the world's debtors, the world's bank, `500000000`, the world's costCenter, `draft`].
- **it reads back with the bank as Paid From and Creditors as Paid To.** `ada` (role company.owner) calls and sends id the last call's paymentEntry, and gets back [the world's company, `Pay`, `2026-03-05`, `Supplier`, the world's supplier, the world's bank, the world's creditors, `200000000`, the world's costCenter, `draft`].
- **it reads back as Receive from the supplier.** `ada` (role company.owner) calls and sends id the last call's paymentEntry, and gets back [the world's company, `Receive`, `2026-03-05`, `Supplier`, the world's supplier, the world's creditors, the world's bank, `50000000`, the world's costCenter, `draft`].
- **it reads back as Pay to the customer, one base unit.** `ada` (role company.owner) calls and sends id the last call's paymentEntry, and gets back [the world's company, `Pay`, `2026-02-10`, `Customer`, the world's customer, the world's bank, the world's debtors, `1`, the world's costCenter, `draft`].

### post a payment entry

Starts from the world `a received advance`.

- **it reads back submitted, as it was drafted.** `ada` (role company.owner) calls and sends id the world's paymentEntry, and gets back [`Receive`, `2026-02-10`, `Customer`, the world's customer, the world's debtors, the world's bank, `500000000`, `submitted`].
- **it reads back cancelled.** `ada` (role company.owner) calls and sends id the world's paymentEntry, and gets back [`500000000`, `cancelled`].

## How to call

```sh
capxul payment-entry get --id <id>
```

HTTP: `POST /payment-entry/get` with the payload as JSON. SDK: `Sdk.payment-entry.get(payload)`.
