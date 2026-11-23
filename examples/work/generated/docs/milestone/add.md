<!-- Generated from the blueprint. Do not edit. -->
# milestone.add

Add a milestone to a mission. Its tasks appear at once: its kinds over its subject.

**Who may call:** the owner of its mission.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 200ms.

## Payload

| field | value |
|---|---|
| mission | milestone.mission |
| title | milestone.title |
| kinds | milestone.kinds |
| of | milestone.of |
| until | milestone.until |

## Answer

| field | value |
|---|---|
| milestone | milestone.id |

## Move

`add`: from nothing (it creates) to active, emitting MilestoneAdded.

## Steps

- `milestone.add.insert` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| MissionClosed | 52 | MS-005 | the milestone is in a state add can't start from; carries `state` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its mission; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## How to call

```sh
work milestone add --mission <mission> --title <title> --kinds <kinds> --of <of> --until <until>
```

HTTP: `POST /milestone/add` with the payload as JSON. SDK: `Sdk.milestone.add(payload)`.
