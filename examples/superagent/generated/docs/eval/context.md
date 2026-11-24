<!-- Generated from the blueprint. Do not edit. -->
# eval.context

Read what a judgement needs: the thread's history and what else it touches.

**Who may call:** the itsMain of its superagent.

## Payload

| field | value |
|---|---|
| superagent | eval.superagent |
| eval | eval.id |

## Answer

| field | value |
|---|---|
| text | text |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| EvalNotFound | 4 | EV-901 | nothing has the id in eval; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the itsMain of its superagent; the handler never runs |

## How to call

```sh
superagent eval context --superagent <superagent> --eval <eval>
```

HTTP: `POST /eval/context` with the payload as JSON. SDK: `Sdk.eval.context(payload)`.
