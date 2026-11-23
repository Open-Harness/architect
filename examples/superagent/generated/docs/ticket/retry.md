<!-- Generated from the blueprint. Do not edit. -->
# ticket.retry

Send a failed input again.

**Who may call:** anyone signed in, or the itsMain of its superagent.

## Payload

| field | value |
|---|---|
| superagent | ticket.superagent |
| ticket | ticket.id |

## Answer

(none)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| TicketNotFound | 4 | TI-901 | nothing has the id in ticket; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't anyone signed in, or the itsMain of its superagent; the handler never runs |

## How to call

```sh
superagent ticket retry --superagent <superagent> --ticket <ticket>
```

HTTP: `POST /ticket/retry` with the payload as JSON. SDK: `Sdk.ticket.retry(payload)`.
