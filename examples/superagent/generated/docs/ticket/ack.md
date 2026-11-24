<!-- Generated from the blueprint. Do not edit. -->
# ticket.ack

The executor acknowledges the message it was woken by, once, in one short reply.

**Who may call:** the itsAgent of the ticket.

## Payload

| field | value |
|---|---|
| ticket | ticket.id |
| trigger | text |
| text | text |

## Answer

(none)

## Steps

- `ticket.ack.write` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the itsAgent of the ticket; the handler never runs |

## How to call

```sh
superagent ticket ack --ticket <ticket> --trigger <trigger> --text <text>
```

HTTP: `POST /ticket/ack` with the payload as JSON. SDK: `Sdk.ticket.ack(payload)`.
