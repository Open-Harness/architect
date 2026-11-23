<!-- Generated from the blueprint. Do not edit. -->
# thread.closed

Say a thread closed: a merged pull request, a closed issue.

**Who may call:** the system.

## Payload

| field | value |
|---|---|
| thread | thread.id |

## Answer

(none)

## Move

`closed`: from idle to idle, emitting ThreadClosed.

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| ThreadNotIdle | 84 | TH-900 | the thread is in a state closed can't start from; carries `state` |
| ThreadNotFound | 4 | TH-901 | nothing has the id in thread; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the system; the handler never runs |

## How to call

```sh
superagent thread closed --thread <thread>
```

HTTP: `POST /thread/closed` with the payload as JSON. SDK: `Sdk.thread.closed(payload)`.
