<!-- Generated from the blueprint. Do not edit. -->
# bridge-individual.reject

Record that Bridge turned down a person's KYC, and why.

**Who may call:** the system.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| individual | bridge-individual.id |
| reason | RejectionReason |

## Answer

| field | value |
|---|---|
| individual | bridge-individual.id |

## Move

`reject`: from started to rejected, emitting KycRejected.

## Steps

- `bridge-individual.reject.update` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| KycAlreadyStarted | 41 | KC-001 | another bridge individual holds this person; by the rule bridge-individual.oneKycPerPerson, carrying person |
| BridgeIndividualNotStarted | 40 | KC-900 | the bridge-individual is in a state reject can't start from; carries `state` |
| BridgeIndividualNotFound | 4 | KC-901 | nothing has the id in individual; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the system; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### bridge: a kyc keeps what bridge gave

Starts from the world `kyc started`.

- **Bridge turns her down.** `bridge` (system) calls and sends individual the world's individual, reason `document photo too dark`, and is answered.

### bridge: a person is checked

Starts from an empty world.

- **Bridge turns Bo down, with its reason.** `bridge` (system) calls and sends individual the last call's individual, reason `selfie does not match the passport`, and gets back an answer matching `^kyc_[0-9a-z]+$`.

## How to call

```sh
capxul bridge-individual reject --individual <individual> --reason <reason>
```

HTTP: `POST /bridge-individual/reject` with the payload as JSON. SDK: `Sdk.bridge-individual.reject(payload)`.
