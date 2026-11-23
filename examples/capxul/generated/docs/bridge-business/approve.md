<!-- Generated from the blueprint. Do not edit. -->
# bridge-business.approve

Record that Bridge approved a company's KYB.

**Who may call:** the system.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| business | bridge-business.id |

## Answer

| field | value |
|---|---|
| business | bridge-business.id |

## Move

`approve`: from started to approved, emitting KybApproved.

## Steps

- `bridge-business.approve.update` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| KybAlreadyStarted | 41 | KB-001 | another bridge business holds this company; by the rule bridge-business.oneKybPerCompany, carrying company |
| BridgeBusinessNotStarted | 40 | KB-900 | the bridge-business is in a state approve can't start from; carries `state` |
| BridgeBusinessNotFound | 4 | KB-901 | nothing has the id in business; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the system; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### bridge: kyb is decided by bridge

Starts from the world `kyb started`.

- **Ada can't approve her own company's KYB.** `ada` (role company.owner) calls and sends business the world's business, and is refused with NotAllowed, AR-001.
- **Bridge approves it.** `bridge` (system) calls and sends business the world's business, and gets back the world's business.
- **an approved KYB can't be approved again.** `bridge` (system) calls and sends business the world's business, and is refused with BridgeBusinessNotStarted, KB-900, carrying state `approved`.
- **a turned-down KYB can't then be approved.** `bridge` (system) calls and sends business the last call's business, and is refused with BridgeBusinessNotStarted, KB-900, carrying state `rejected`.

## How to call

```sh
capxul bridge-business approve --business <business>
```

HTTP: `POST /bridge-business/approve` with the payload as JSON. SDK: `Sdk.bridge-business.approve(payload)`.
