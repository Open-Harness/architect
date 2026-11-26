<!-- Generated from the blueprint. Do not edit. -->
# supplier.disable

Disable a supplier: no payment to it can be submitted until it is enabled again.

**Who may call:** the owner of its supplier.company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 100ms.

## Payload

| field | value |
|---|---|
| supplier | supplier.id |

## Answer

| field | value |
|---|---|
| supplier | supplier.id |

## Move

`disable`: from active to disabled, emitting SupplierDisabled.

## Steps

- `supplier.disable.update` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| SupplierNotActive | 40 | SU-900 | the supplier is in a state disable can't start from; carries `state` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its supplier.company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### add customers and suppliers

Starts from the world `an outside supplier`.

- **Ada disables the second.** `ada` (role company.owner) calls and sends supplier the last call's supplier, and is answered.
- **Bo can't disable it.** `bo` (signed in) calls and sends supplier the world's supplier, and is refused with NotAllowed, AR-001.
- **Ada disables it.** `ada` (role company.owner) calls and sends supplier the world's supplier, and is answered.
- **it can't be disabled twice.** `ada` (role company.owner) calls and sends supplier the world's supplier, and is refused with SupplierNotActive, SU-900, carrying state `disabled`.

### post a payment entry

Starts from the world `a received advance`.

- **Ada disables Mara Office Rentals.** `ada` (role company.owner) calls and sends supplier the world's supplier, and gets back the world's supplier.

## How to call

```sh
capxul supplier disable --supplier <supplier>
```

HTTP: `POST /supplier/disable` with the payload as JSON. SDK: `Sdk.supplier.disable(payload)`.
