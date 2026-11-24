<!-- Generated from the blueprint. Do not edit. -->
# ticket.request-status

Ask a ticket's executor where it stands; a person's request may use the seat kept for a person.

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
| SuperagentNotFound | 4 | SU-901 | nothing has the id in superagent; the handler never runs; carries `id` |
| TicketNotFound | 4 | TI-901 | nothing has the id in ticket; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't anyone signed in, or the itsMain of its superagent; the handler never runs |

## How to call

```sh
superagent ticket request-status --superagent <superagent> --ticket <ticket>
```

HTTP: `POST /ticket/request-status` with the payload as JSON. SDK: `Sdk.ticket.request-status(payload)`.
