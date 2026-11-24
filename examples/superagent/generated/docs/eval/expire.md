<!-- Generated from the blueprint. Do not edit. -->
# eval.expire

Give up on an eval that ran out of time: it is unavailable, and keeps its triggers until a person reevaluates one.

**Who may call:** the system.

## Payload

| field | value |
|---|---|
| eval | eval.id |

## Answer

(none)

## Move

`expired`: from delivered to unavailable, emitting EvalExpired.

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| EvalNotQueued | 85 | EV-900 | the eval is in a state expired can't start from; carries `state` |
| EvalNotFound | 4 | EV-901 | nothing has the id in eval; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the system; the handler never runs |

## How to call

```sh
superagent eval expire --eval <eval>
```

HTTP: `POST /eval/expire` with the payload as JSON. SDK: `Sdk.eval.expire(payload)`.
