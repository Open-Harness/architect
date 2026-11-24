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
| SuperagentNotFound | 4 | SU-901 | nothing has the id in superagent; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the system; the handler never runs |

## How to call

```sh
superagent eval start --superagent <superagent> --thread <thread> --triggers <triggers> --timeoutMs <timeoutMs>
```

HTTP: `POST /eval/start` with the payload as JSON. SDK: `Sdk.eval.start(payload)`.
