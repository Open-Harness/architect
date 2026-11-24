<!-- Generated from the blueprint. Do not edit. -->
# ticket.note

Write a note on a ticket that does not wake its executor.

**Who may call:** the itsMain of its superagent.

## Payload

| field | value |
|---|---|
| superagent | ticket.superagent |
| ticket | ticket.id |
| text | text |

## Answer

(none)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| TicketNotFound | 4 | TI-901 | nothing has the id in ticket; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the itsMain of its superagent; the handler never runs |

## How to call

```sh
superagent ticket note --superagent <superagent> --ticket <ticket> --text <text>
```

HTTP: `POST /ticket/note` with the payload as JSON. SDK: `Sdk.ticket.note(payload)`.
