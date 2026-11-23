<!-- Generated from the blueprint. Do not edit. -->
# mission.open

Open a mission over the blueprint revision named. The manager starts by asking about the blueprint's gaps.

**Who may call:** anyone signed in.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 200ms.

## Payload

| field | value |
|---|---|
| title | mission.title |
| target | mission.target |
| blueprint | mission.blueprint |

## Answer

| field | value |
|---|---|
| mission | mission.id |

## Move

`open`: from nothing (it creates) to intake, emitting MissionOpened.

## Steps

- `mission.open.insert` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't anyone signed in; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## How to call

```sh
work mission open --title <title> --target <target> --blueprint <blueprint>
```

HTTP: `POST /mission/open` with the payload as JSON. SDK: `Sdk.mission.open(payload)`.
