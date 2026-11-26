<!-- Generated from the blueprint. Do not edit. -->
# customer.enable

Enable a disabled customer again.

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

`enable`: from disabled to active, emitting CustomerEnabled.

## Steps

- `customer.enable.update` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| CustomerNotActive | 40 | CU-900 | the customer is in a state enable can't start from; carries `state` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its customer.company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### add customers and suppliers

Starts from the world `an outside supplier`.

- **Kibo Stores can't be enabled while active.** `ada` (role company.owner) calls and sends customer the world's customer, and is refused with CustomerNotActive, CU-900, carrying state `active`.
- **Bo can't enable it.** `bo` (signed in) calls and sends customer the world's customer, and is refused with NotAllowed, AR-001.
- **Ada enables it again.** `ada` (role company.owner) calls and sends customer the world's customer, and is answered.

## How to call

```sh
capxul customer enable --customer <customer>
```

HTTP: `POST /customer/enable` with the payload as JSON. SDK: `Sdk.customer.enable(payload)`.
