<!-- Generated from the blueprint. Do not edit. -->
# outgoing-message.withdraw

Drop a ticket's pending replies: it ended, or its superagent retired.

**Who may call:** the system.

## Payload

| field | value |
|---|---|
| ticket | outgoing-message.ticket |

## Answer

| field | value |
|---|---|
| message | outgoing-message.id |

## Move

`withdrawn`: from pending to dropped, emitting ReplyWithdrawn.

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| OutgoingMessageNotPending | 101 | OU-900 | the outgoing-message is in a state withdrawn can't start from; carries `state` |
| TicketNotFound | 4 | TI-901 | nothing has the id in ticket; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the system; the handler never runs |

## How to call

```sh
superagent outgoing-message withdraw --ticket <ticket>
```

HTTP: `POST /outgoing-message/withdraw` with the payload as JSON. SDK: `Sdk.outgoing-message.withdraw(payload)`.
