<!-- Generated from the blueprint. Do not edit. -->
# attention.raise

Ask the mission's owner for a decision only they can make.

**Who may call:** the owner of its mission.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 200ms.

## Payload

| field | value |
|---|---|
| mission | attention.mission |
| kind | attention.kind |
| title | attention.title |
| why | attention.why |
| task | attention.task |

## Answer

| field | value |
|---|---|
| attention | attention.id |

## Move

`raise`: from nothing (it creates) to open, emitting AttentionRaised.

## Steps

- `attention.raise.insert` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| MissionNotRunning | 55 | MS-002 | the attention is in a state raise can't start from; carries `state` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its mission; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## How to call

```sh
work attention raise --mission <mission> --kind <kind> --title <title> --why <why> --task <task>
```

HTTP: `POST /attention/raise` with the payload as JSON. SDK: `Sdk.attention.raise(payload)`.
