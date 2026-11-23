<!-- Generated from the blueprint. Do not edit. -->
# ticket.stage

Read one ticket by its id: superagent, title, state.

**Who may call:** anyone signed in, or the itsMain of its superagent, or the itsAgent of the ticket.

**A read:** answered from the records, with no handler.

## Payload

| field | value |
|---|---|
| id | ticket.id |

## Answer

| field | value |
|---|---|
| superagent | ticket.superagent |
| title | ticket.title |
| state | text |
| stage | schema |
| why | schema |
| label | text |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't anyone signed in, or the itsMain of its superagent, or the itsAgent of the ticket; the handler never runs |

## How to call

```sh
superagent ticket stage --id <id>
```

HTTP: `POST /ticket/stage` with the payload as JSON. SDK: `Sdk.ticket.stage(payload)`.
