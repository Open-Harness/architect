<!-- Generated from the blueprint. Do not edit. -->
# mission.tasks

The mission's tasks, each in the column its facts put it in.

**Who may call:** the owner of its mission.

**Budget:** p95 300ms.

## Payload

| field | value |
|---|---|
| mission | mission.id |

## Answer

| field | value |
|---|---|
| tasks | Tasks |

## Steps

- `mission.tasks.plan` (database)
- `mission.tasks.facts` (blank)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its mission; the handler never runs |

## How to call

```sh
work mission tasks --mission <mission>
```

HTTP: `POST /mission/tasks` with the payload as JSON. SDK: `Sdk.mission.tasks(payload)`.
