<!-- Generated from the blueprint. Do not edit. -->
# outgoing-message.retry

Queue a failed reply again, once its wait has passed.

**Who may call:** the system.

## Payload

| field | value |
|---|---|
| message | outgoing-message.id |

## Answer

(none)

## Move

`requeued`: from pending to pending, emitting ReplyQueued.

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| OutgoingMessageNotPending | 101 | OU-900 | the outgoing-message is in a state requeued can't start from; carries `state` |
| OutgoingMessageNotFound | 4 | OU-901 | nothing has the id in message; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the system; the handler never runs |

## How to call

```sh
superagent outgoing-message retry --message <message>
```

HTTP: `POST /outgoing-message/retry` with the payload as JSON. SDK: `Sdk.outgoing-message.retry(payload)`.
