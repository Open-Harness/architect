<!-- Generated from the blueprint. Do not edit. -->
# ticket.attach

Attach another thread to a ticket.

**Who may call:** the itsMain of its superagent.

## Payload

| field | value |
|---|---|
| superagent | ticket.superagent |
| ticket | ticket.id |
| thread | text |

## Answer

(none)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| TicketNotFound | 4 | TI-901 | nothing has the id in ticket; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the itsMain of its superagent; the handler never runs |

## How to call

```sh
superagent ticket attach --superagent <superagent> --ticket <ticket> --thread <thread>
```

HTTP: `POST /ticket/attach` with the payload as JSON. SDK: `Sdk.ticket.attach(payload)`.
