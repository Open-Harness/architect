<!-- Generated from the blueprint. Do not edit. -->
# thread.bind

Make the thread an event belongs to, once, for this superagent.

**Who may call:** the system.

## Payload

| field | value |
|---|---|
| superagent | thread.superagent |
| source | thread.source |
| key | thread.key |
| channel | thread.channel |

## Answer

| field | value |
|---|---|
| thread | thread.id |

## Move

`bind`: from nothing (it creates) to idle, emitting ThreadSubscribed.

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| SuperagentNotFound | 4 | SU-901 | nothing has the id in superagent; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the system; the handler never runs |

## How to call

```sh
superagent thread bind --superagent <superagent> --source <source> --key <key> --channel <channel>
```

HTTP: `POST /thread/bind` with the payload as JSON. SDK: `Sdk.thread.bind(payload)`.
