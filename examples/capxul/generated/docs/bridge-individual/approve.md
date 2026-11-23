<!-- Generated from the blueprint. Do not edit. -->
# bridge-individual.approve

Record that Bridge approved a person's KYC.

**Who may call:** the system.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| individual | bridge-individual.id |

## Answer

| field | value |
|---|---|
| individual | bridge-individual.id |

## Move

`approve`: from started to approved, emitting KycApproved.

## Steps

- `bridge-individual.approve.update` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| KycAlreadyStarted | 41 | KC-001 | another bridge individual holds this person; by the rule bridge-individual.oneKycPerPerson, carrying person |
| BridgeIndividualNotStarted | 40 | KC-900 | the bridge-individual is in a state approve can't start from; carries `state` |
| BridgeIndividualNotFound | 4 | KC-901 | nothing has the id in individual; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the system; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### bridge: a person is checked

Starts from an empty world.

- **Ada can't approve herself.** `ada` (signed in) calls and sends individual the last call's individual, and is refused with NotAllowed, AR-001.
- **Bridge approves her.** `bridge` (system) calls and sends individual the last call's individual, and gets back an answer matching `^kyc_[0-9a-z]+$`.
- **a turned-down KYC can't then be approved.** `bridge` (system) calls and sends individual the last call's individual, and is refused with BridgeIndividualNotStarted, KC-900, carrying state `rejected`.

### bridge: an approved kyc keeps what bridge gave

Starts from the world `kyc started`.

- **Bridge approves her.** `bridge` (system) calls and sends individual the world's individual, and gets back the world's individual.

## How to call

```sh
capxul bridge-individual approve --individual <individual>
```

HTTP: `POST /bridge-individual/approve` with the payload as JSON. SDK: `Sdk.bridge-individual.approve(payload)`.
