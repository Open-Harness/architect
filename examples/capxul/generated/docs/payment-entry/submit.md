<!-- Generated from the blueprint. Do not edit. -->
# payment-entry.submit

Submit a payment, posting the party's ledger line and the bank's.

**Who may call:** the owner of its paymentEntry.company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 300ms.

## Payload

| field | value |
|---|---|
| paymentEntry | payment-entry.id |

## Answer

| field | value |
|---|---|
| paymentEntry | payment-entry.id |
| posted | LineCount |

## Move

`submit`: from draft to submitted, emitting PaymentEntrySubmitted.

## Steps

- `payment-entry.submit.load` (database)
- `payment-entry.submit.post` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| PaymentPostingDateOutsideFiscalYear | 49 | PY-009 | declared in errors.ts, carrying postingDate |
| PartyDisabled | 50 | PY-010 | declared in errors.ts |
| PaymentEntryNotDraft | 40 | PY-900 | the payment-entry is in a state submit can't start from; carries `state` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its paymentEntry.company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### post a payment entry

Starts from the world `a received advance`.

- **Bo can't submit it.** `bo` (signed in) calls and sends paymentEntry the world's paymentEntry, and is refused with NotAllowed, AR-001.
- **Ada submits it: two ledger lines.** `ada` (role company.owner) calls and sends paymentEntry the world's paymentEntry, and gets back [the world's paymentEntry, `2`].
- **Ada can't submit it twice.** `ada` (role company.owner) calls and sends paymentEntry the world's paymentEntry, and is refused with PaymentEntryNotDraft, PY-900, carrying state `submitted`.
- **nor submitted again.** `ada` (role company.owner) calls and sends paymentEntry the world's paymentEntry, and is refused with PaymentEntryNotDraft, PY-900, carrying state `cancelled`.
- **and submits it: two ledger lines.** `ada` (role company.owner) calls and sends paymentEntry the last call's paymentEntry, and gets back `2`.
- **Ada submits it.** `ada` (role company.owner) calls and sends paymentEntry the last call's paymentEntry, and gets back `2`.
- **Ada submits it.** `ada` (role company.owner) calls and sends paymentEntry the last call's paymentEntry, and gets back `2`.
- **and submits it.** `ada` (role company.owner) calls and sends paymentEntry the last call's paymentEntry, and gets back `2`.
- **submitted.** `ada` (role company.owner) calls and sends paymentEntry the last call's paymentEntry, and gets back `2`.
- **it can't be submitted: the day is in none of Acme Trading's fiscal years.** `ada` (role company.owner) calls and sends paymentEntry the last call's paymentEntry, and is refused with PaymentPostingDateOutsideFiscalYear, PY-009, carrying postingDate `2025-12-31`.
- **refused the same way.** `ada` (role company.owner) calls and sends paymentEntry the last call's paymentEntry, and is refused with PaymentPostingDateOutsideFiscalYear, PY-009, carrying postingDate `2027-01-01`.
- **another company's year doesn't count.** `ada` (role company.owner) calls and sends paymentEntry the last call's paymentEntry, and is refused with PaymentPostingDateOutsideFiscalYear, PY-009, carrying postingDate `2027-03-01`.
- **submitted.** `ada` (role company.owner) calls and sends paymentEntry the last call's paymentEntry, and gets back `2`.
- **submitted.** `ada` (role company.owner) calls and sends paymentEntry the last call's paymentEntry, and gets back `2`.
- **but not submitted: the fiscal year is judged before the party.** `ada` (role company.owner) calls and sends paymentEntry the last call's paymentEntry, and is refused with PaymentPostingDateOutsideFiscalYear, PY-009, carrying postingDate `2027-01-04`.
- **but not submitted: Mara Office Rentals is disabled.** `ada` (role company.owner) calls and sends paymentEntry the last call's paymentEntry, and is refused with PartyDisabled, PY-010.
- **now it submits.** `ada` (role company.owner) calls and sends paymentEntry the last call's paymentEntry, and gets back `2`.
- **submitted.** `ada` (role company.owner) calls and sends paymentEntry the last call's paymentEntry, and gets back `2`.
- **but not submitted: money in from a disabled customer is refused too.** `ada` (role company.owner) calls and sends paymentEntry the last call's paymentEntry, and is refused with PartyDisabled, PY-010.

## How to call

```sh
capxul payment-entry submit --paymentEntry <paymentEntry>
```

HTTP: `POST /payment-entry/submit` with the payload as JSON. SDK: `Sdk.payment-entry.submit(payload)`.
