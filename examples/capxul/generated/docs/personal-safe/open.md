<!-- Generated from the blueprint. Do not edit. -->
# personal-safe.open

Open your own Safe. It has no address until you claim it with the key you sign with.

**Who may call:** anyone signed in.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

(none)

## Answer

| field | value |
|---|---|
| safe | personal-safe.id |

## Move

`open`: from nothing (it creates) to unclaimed, emitting PersonalSafeOpened.

## Steps

- `personal-safe.open.insert` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| SafeAlreadyOpen | 41 | SF-001 | another personal safe holds this person; by the rule personal-safe.oneSafePerPerson, carrying person |
| NotAllowed | 3 | AR-001 | the caller isn't anyone signed in; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### safe: a person opens their safe

Starts from an empty world.

- **the system can't open a Safe: it is nobody.** `nobody` (system) calls and sends nothing, and is refused with NotAllowed, AR-001.
- **Ada opens her own Safe from the command line.** `ada` (signed in) calls and sends nothing, with the request key `ada-safe`, and gets back an answer matching `^saf_[0-9a-z]+$`.
- **a second open, a new request, is refused: a person has one Safe.** `ada` (signed in) calls and sends nothing, and is refused with SafeAlreadyOpen, SF-001, carrying person the cast's ada person.
- **nor through her agent.** `ada` (signed in) calls and sends nothing, and is refused with SafeAlreadyOpen, SF-001, carrying person the cast's ada person.
- **Bo's agent opens Bo's own Safe through MCP: his, not Ada's.** `bo` (signed in) calls and sends nothing, and gets back an answer matching `^saf_[0-9a-z]+$`.
- **a second open from Bo, in his own session, is refused too.** `bo` (signed in) calls and sends nothing, and is refused with SafeAlreadyOpen, SF-001, carrying person the cast's bo person.

### safe: opening again is the same safe

Starts from the world `ada has opened her safe`.

- **her first request again, by her key, is the same call: the Safe she was answered, and nothing new.** `ada` (signed in) calls and sends nothing, with the request key `ada-safe`, and gets back the world's adaSafe.
- **a new request by her key is refused.** `ada` (signed in) calls and sends nothing, and is refused with SafeAlreadyOpen, SF-001, carrying person the cast's ada person.
- **and in her own session.** `ada` (signed in) calls and sends nothing, and is refused with SafeAlreadyOpen, SF-001, carrying person the cast's ada person.
- **and through her agent.** `ada` (signed in) calls and sends nothing, and is refused with SafeAlreadyOpen, SF-001, carrying person the cast's ada person.

## How to call

```sh
capxul personal-safe open
```

HTTP: `POST /personal-safe/open` with the payload as JSON. SDK: `Sdk.personal-safe.open(payload)`.
