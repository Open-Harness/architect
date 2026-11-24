<!-- Generated from the blueprint. Do not edit. -->
# ticket.end

End a ticket: the reported work is ready, its threads are closed, or the playbook says so. Its executor stays, idle.

**Who may call:** the system.

## Payload

| field | value |
|---|---|
| ticket | ticket.id |

## Answer

(none)

## Move

`end`: from open to ended, emitting TicketEnded.

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| TicketNotOpen | 90 | TI-900 | the ticket is in a state end can't start from; carries `state` |
| TicketNotFound | 4 | TI-901 | nothing has the id in ticket; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the system; the handler never runs |

## How to call

```sh
superagent ticket end --ticket <ticket>
```

HTTP: `POST /ticket/end` with the payload as JSON. SDK: `Sdk.ticket.end(payload)`.
