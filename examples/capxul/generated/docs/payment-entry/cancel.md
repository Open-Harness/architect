<!-- Generated from the blueprint. Do not edit. -->
# payment-entry.cancel

Cancel a submitted payment, posting a reversing ledger line for each it posted.

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
| reversed | LineCount |

## Move

`cancel`: from submitted to cancelled, emitting PaymentEntryCancelled.

## Steps

- `payment-entry.cancel.load` (database)
- `payment-entry.cancel.reverse` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| PartyDisabled | 50 | PY-010 | declared in errors.ts |
| PaymentEntryNotDraft | 40 | PY-900 | the payment-entry is in a state cancel can't start from; carries `state` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its paymentEntry.company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### post a payment entry

Starts from the world `a received advance`.

- **Ada can't cancel it while it is a draft.** `ada` (role company.owner) calls and sends paymentEntry the world's paymentEntry, and is refused with PaymentEntryNotDraft, PY-900, carrying state `draft`.
- **Bo can't cancel it.** `bo` (signed in) calls and sends paymentEntry the world's paymentEntry, and is refused with NotAllowed, AR-001.
- **Ada cancels it: two reversing lines.** `ada` (role company.owner) calls and sends paymentEntry the world's paymentEntry, and gets back [the world's paymentEntry, `2`].
- **it can't be cancelled twice.** `ada` (role company.owner) calls and sends paymentEntry the world's paymentEntry, and is refused with PaymentEntryNotDraft, PY-900, carrying state `cancelled`.
- **and cancels it.** `ada` (role company.owner) calls and sends paymentEntry the last call's paymentEntry, and gets back `2`.
- **that payment can't be cancelled while its supplier is disabled.** `ada` (role company.owner) calls and sends paymentEntry the last call's items 0 voucherId, and is refused with PartyDisabled, PY-010.

## How to call

```sh
capxul payment-entry cancel --paymentEntry <paymentEntry>
```

HTTP: `POST /payment-entry/cancel` with the payload as JSON. SDK: `Sdk.payment-entry.cancel(payload)`.
