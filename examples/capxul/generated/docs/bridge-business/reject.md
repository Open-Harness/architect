<!-- Generated from the blueprint. Do not edit. -->
# bridge-business.reject

Record that Bridge turned down a company's KYB, and why.

**Who may call:** the system.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| business | bridge-business.id |
| reason | RejectionReason |

## Answer

| field | value |
|---|---|
| business | bridge-business.id |

## Move

`reject`: from started to rejected, emitting KybRejected.

## Steps

- `bridge-business.reject.update` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| KybAlreadyStarted | 41 | KB-001 | another bridge business holds this company; by the rule bridge-business.oneKybPerCompany, carrying company |
| BridgeBusinessNotStarted | 40 | KB-900 | the bridge-business is in a state reject can't start from; carries `state` |
| BridgeBusinessNotFound | 4 | KB-901 | nothing has the id in business; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the system; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### bridge: a rejected kyb keeps what bridge gave

Starts from the world `kyb started`.

- **Bridge turns Acme Trading down.** `bridge` (system) calls and sends business the world's business, reason `proof of address missing`, and gets back the world's business.

### bridge: kyb is decided by bridge

Starts from the world `two kybs started`.

- **nor turned down afterwards.** `bridge` (system) calls and sends business the world's business, reason `documents expired`, and is refused with BridgeBusinessNotStarted, KB-900, carrying state `approved`.
- **Bo can't turn down his own KYB either.** `bo` (signed in) calls and sends business the world's boBusiness, reason `changed my mind`, and is refused with NotAllowed, AR-001.
- **Bridge turns Bo's down, with its reason.** `bridge` (system) calls and sends business the world's boBusiness, reason `registration certificate unreadable`, and gets back an answer matching `^kyb_[0-9a-z]+$`.

## How to call

```sh
capxul bridge-business reject --business <business> --reason <reason>
```

HTTP: `POST /bridge-business/reject` with the payload as JSON. SDK: `Sdk.bridge-business.reject(payload)`.
