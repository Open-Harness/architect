<!-- Generated from the blueprint. Do not edit. -->
# customer.disable

Disable a customer: no payment from it can be submitted until it is enabled again.

**Who may call:** the owner of its customer.company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 100ms.

## Payload

| field | value |
|---|---|
| customer | customer.id |

## Answer

| field | value |
|---|---|
| customer | customer.id |

## Move

`disable`: from active to disabled, emitting CustomerDisabled.

## Steps

- `customer.disable.update` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| CustomerNotActive | 40 | CU-900 | the customer is in a state disable can't start from; carries `state` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its customer.company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### add customers and suppliers

Starts from the world `an outside supplier`.

- **Ada disables the second.** `ada` (role company.owner) calls and sends customer the last call's customer, and is answered.
- **nor disable Kibo Stores.** `bo` (signed in) calls and sends customer the world's customer, and is refused with NotAllowed, AR-001.
- **Ada disables it.** `ada` (role company.owner) calls and sends customer the world's customer, and gets back the world's customer.
- **it can't be disabled twice.** `ada` (role company.owner) calls and sends customer the world's customer, and is refused with CustomerNotActive, CU-900, carrying state `disabled`.

### draft a payment entry

Starts from the world `an outside supplier`.

- **Ada disables Kibo Stores.** `ada` (role company.owner) calls and sends customer the world's customer, and gets back the world's customer.

### post a payment entry

Starts from the world `a received advance`.

- **Ada disables Kibo Stores.** `ada` (role company.owner) calls and sends customer the world's customer, and gets back the world's customer.

## How to call

```sh
capxul customer disable --customer <customer>
```

HTTP: `POST /customer/disable` with the payload as JSON. SDK: `Sdk.customer.disable(payload)`.
