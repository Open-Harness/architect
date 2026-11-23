<!-- Generated from the blueprint. Do not edit. -->
# thread.unsubscribe

Stop a ticket following a thread: a person's call, or the main agent's.

**Who may call:** anyone signed in, or the itsMain of its superagent.

## Payload

| field | value |
|---|---|
| superagent | thread.superagent |
| thread | thread.id |

## Answer

(none)

## Move

`unsubscribe`: from idle or queued or evaluating to idle, emitting ThreadUnsubscribed.

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| ThreadNotIdle | 84 | TH-900 | the thread is in a state unsubscribe can't start from; carries `state` |
| ThreadNotFound | 4 | TH-901 | nothing has the id in thread; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't anyone signed in, or the itsMain of its superagent; the handler never runs |

## How to call

```sh
superagent thread unsubscribe --superagent <superagent> --thread <thread>
```

HTTP: `POST /thread/unsubscribe` with the payload as JSON. SDK: `Sdk.thread.unsubscribe(payload)`.
