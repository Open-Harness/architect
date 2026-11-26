<!-- Generated from the blueprint. Do not edit. -->
# safe.record-company

Record a company's Safe, owned by its founder's own Safe, at the address it will have once deployed.

**Who may call:** the owner of its company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

| field | value | description |
|---|---|---|
| company | company.id | The company whose Safe it is. |

## Answer

| field | value | description |
|---|---|---|
| safe | safe.id |  |
| account | safe.account | Its address, worked out before it is deployed, as a CAIP-10 account with the address checksummed (EIP-55). |

## Move

`recordCompany`: from nothing (it creates) to counterfactual, emitting CompanySafeRecorded.

## Steps

- `safe.record-company.load` (database)
- `safe.record-company.insert` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| FounderHasNoSafe | 42 | SF-002 | declared in errors.ts, carrying company |
| SafeAlreadyRecorded | 41 | SF-001 | another safe holds this salt nonce; by the rule safe.oneSafeEach, carrying saltNonce |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### safe: a company records its safe

Starts from the world `three company safes`.

- **Bo can't record a Safe for Ada's company.** `bo` (signed in) calls and sends company the world's company, and is refused with NotAllowed, AR-001.
- **nor can Bo's agent.** `bo` (signed in) calls and sends company the world's company, and is refused with NotAllowed, AR-001.
- **Ada's agent's request again is the same call, and nothing new.** `ada` (signed in) calls and sends company the world's company, with the request key `acme-trading-safe`, and gets back [the world's tradingSafe, the world's tradingAccount].
- **a second Safe for Acme Trading, a new request, is refused, naming that salt nonce.** `ada` (signed in) calls and sends company the world's company, and is refused with SafeAlreadyRecorded, SF-001, carrying saltNonce the last call's saltNonce.

### safe: a founder without a safe is refused

Starts from the world `ada has a safe`.

- **Bo can't record Bo Ltd's Safe before he has one of his own.** `bo` (signed in) calls and sends company the world's boCompany, and is refused with FounderHasNoSafe, SF-002, carrying company the world's boCompany.
- **nor can his agent.** `bo` (signed in) calls and sends company the world's boCompany, and is refused with FounderHasNoSafe, SF-002, carrying company the world's boCompany.
- **Ada has a Safe, but Bo Ltd isn't hers to record one for.** `ada` (signed in) calls and sends company the world's boCompany, and is refused with NotAllowed, AR-001.
- **now Bo Ltd's Safe can be recorded.** `bo` (signed in) calls and sends company the world's boCompany, and gets back an answer matching `^saf_[0-9a-z]+$` and gets back an answer matching `^eip155:31337:0x[0-9a-fA-F]{40}$`.

## How to call

```sh
capxul safe record-company --company <company>
```

HTTP: `POST /safe/record-company` with the payload as JSON. SDK: `Sdk.safe.record-company(payload)`.
