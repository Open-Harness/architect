<!-- Generated from the blueprint. Do not edit. -->
# outgoing-message.reply

Queue a reply: by purpose, in order within its conversation. Only the head of a conversation has an outbox row.

**Who may call:** the itsMain of its superagent, or the system.

## Payload

| field | value |
|---|---|
| superagent | outgoing-message.superagent |
| ticket | outgoing-message.ticket |
| conversation | outgoing-message.conversation |
| purpose | outgoing-message.purpose |
| text | outgoing-message.text |

## Answer

| field | value |
|---|---|
| message | outgoing-message.id |

## Move

`queued`: from nothing (it creates) to pending, emitting ReplyQueued.

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| SuperagentNotFound | 4 | SU-901 | nothing has the id in superagent; the handler never runs; carries `id` |
| TicketNotFound | 4 | TI-901 | nothing has the id in ticket; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the itsMain of its superagent, or the system; the handler never runs |

## How to call

```sh
superagent outgoing-message reply --superagent <superagent> --ticket <ticket> --conversation <conversation> --purpose <purpose> --text <text>
```

HTTP: `POST /outgoing-message/reply` with the payload as JSON. SDK: `Sdk.outgoing-message.reply(payload)`.
