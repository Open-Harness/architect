<!-- Generated from the blueprint. Do not edit. -->
# ticket.resume

Wake an ended ticket on a person's message, after its mandate is revalidated: the same executor, with its memory.

**Who may call:** the system.

## Payload

| field | value |
|---|---|
| ticket | ticket.id |

## Answer

(none)

## Move

`resume`: from ended to open, emitting TicketResumed.

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| TicketNotOpen | 90 | TI-900 | the ticket is in a state resume can't start from; carries `state` |
| TicketNotFound | 4 | TI-901 | nothing has the id in ticket; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the system; the handler never runs |

## How to call

```sh
superagent ticket resume --ticket <ticket>
```

HTTP: `POST /ticket/resume` with the payload as JSON. SDK: `Sdk.ticket.resume(payload)`.
