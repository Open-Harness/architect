<!-- Generated from the blueprint. Do not edit. -->
# eval.start

Make an eval for one thread's waiting triggers.

**Who may call:** the system.

## Payload

| field | value |
|---|---|
| superagent | eval.superagent |
| thread | eval.thread |
| triggers | eval.triggers |
| timeoutMs | eval.timeoutMs |

## Answer

| field | value |
|---|---|
| eval | eval.id |

## Move

`started`: from nothing (it creates) to queued, emitting EvalStarted.

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the system; the handler never runs |

## How to call

```sh
superagent eval start --superagent <superagent> --thread <thread> --triggers <triggers> --timeoutMs <timeoutMs>
```

HTTP: `POST /eval/start` with the payload as JSON. SDK: `Sdk.eval.start(payload)`.
