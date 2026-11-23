<!-- Generated from the blueprint. Do not edit. -->
# milestone.drop

Drop a milestone from its mission's scope. Its tasks leave the board; the burn-down shows the step.

**Who may call:** the owner of its mission.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| mission | milestone.mission |
| milestone | milestone.id |

## Answer

(none)

## Move

`drop`: from active to dropped, emitting MilestoneDropped.

## Steps

- `milestone.drop.record` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| MilestoneNotActive | 52 | ML-900 | the milestone is in a state drop can't start from; carries `state` |
| MilestoneNotFound | 4 | ML-901 | nothing has the id in milestone; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its mission; the handler never runs |

## How to call

```sh
work milestone drop --mission <mission> --milestone <milestone>
```

HTTP: `POST /milestone/drop` with the payload as JSON. SDK: `Sdk.milestone.drop(payload)`.
