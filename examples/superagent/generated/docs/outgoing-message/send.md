<!-- Generated from the blueprint. Do not edit. -->
# outgoing-message.send

Send a conversation's head through its connection. A failed call is counted and queued again; the outbox always sees a success.

**Who may call:** the system.

## Payload

| field | value |
|---|---|
| message | outgoing-message.id |

## Answer

| field | value |
|---|---|
| sent | schema |

## Move

`settled`: from pending to pending or sent or dropped, emitting ReplySettled.

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| OutgoingMessageNotPending | 101 | OU-900 | the outgoing-message is in a state settled can't start from; carries `state` |
| OutgoingMessageNotFound | 4 | OU-901 | nothing has the id in message; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the system; the handler never runs |

## How to call

```sh
superagent outgoing-message send --message <message>
```

HTTP: `POST /outgoing-message/send` with the payload as JSON. SDK: `Sdk.outgoing-message.send(payload)`.
