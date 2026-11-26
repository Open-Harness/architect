<!-- Generated from the blueprint. Do not edit. -->
# safe.record

Record your own Safe, at the address it will have once deployed. Nothing is sent to the chain.

**Who may call:** anyone signed in.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

(none)

## Answer

| field | value | description |
|---|---|---|
| safe | safe.id |  |
| account | safe.account | Its address, worked out before it is deployed, as a CAIP-10 account with the address checksummed (EIP-55). |

## Move

`record`: from nothing (it creates) to counterfactual, emitting PersonalSafeRecorded.

## Steps

- `safe.record.insert` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| SafeAlreadyRecorded | 41 | SF-001 | another safe holds this salt nonce; by the rule safe.oneSafeEach, carrying saltNonce |
| NotAllowed | 3 | AR-001 | the caller isn't anyone signed in; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### safe: a company records its safe

Starts from the world `ada and bo have safes`.

- **Ada's first request again is the same call: her one Safe, and nothing new.** `ada` (signed in) calls and sends nothing, with the request key `ada-safe`, and gets back [the world's adaSafe, the world's adaAccount].

### safe: a founder without a safe is refused

Starts from the world `ada has a safe`.

- **Bo records his own Safe from the command line.** `bo` (signed in) calls and sends nothing, and is answered.

### safe: a person records their safe

Starts from an empty world.

- **the system can't record a Safe: it is nobody, so it has none.** `nobody` (system) calls and sends nothing, and is refused with NotAllowed, AR-001.
- **Ada records her own Safe from the command line.** `ada` (signed in) calls and sends nothing, with the request key `ada-safe`, and gets back an answer matching `^saf_[0-9a-z]+$` and gets back an answer matching `^eip155:31337:0x[0-9a-fA-F]{40}$`.
- **a second record, a new request, is refused: a person has one Safe.** `ada` (signed in) calls and sends nothing, and is refused with SafeAlreadyRecorded, SF-001, carrying saltNonce the last call's saltNonce.
- **Bo's agent records Bo's own Safe through MCP: his, not Ada's.** `bo` (signed in) calls and sends nothing, and gets back an answer matching `^saf_[0-9a-z]+$` and gets back an answer matching `^eip155:31337:0x[0-9a-fA-F]{40}$`.

## How to call

```sh
capxul safe record
```

HTTP: `POST /safe/record` with the payload as JSON. SDK: `Sdk.safe.record(payload)`.
