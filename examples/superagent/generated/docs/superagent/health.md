<!-- Generated from the blueprint. Do not edit. -->
# superagent.health

Read one superagent by its id: name, state, pausedAt.

**Who may call:** anyone signed in, or the itsMain of the superagent.

**A read:** answered from the records, with no handler.

**Budget:** p95 200ms.

## Payload

| field | value |
|---|---|
| id | superagent.id |

## Answer

| field | value |
|---|---|
| name | superagent.name |
| state | text |
| pausedAt (optional) | superagent.pausedAt |
| problems | schema |
| more | schema |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't anyone signed in, or the itsMain of the superagent; the handler never runs |

## How to call

```sh
superagent superagent health --id <id>
```

HTTP: `POST /superagent/health` with the payload as JSON. SDK: `Sdk.superagent.health(payload)`.
