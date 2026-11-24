<!-- Generated from the blueprint. Do not edit. -->
# eval.decide

Record one judgement per enabled rule.

**Who may call:** the itsMain of its superagent.

## Payload

| field | value |
|---|---|
| superagent | eval.superagent |
| eval | eval.id |
| judgements | schema |

## Answer

(none)

## Move

`decided`: from delivered to decided, emitting EvalDecided.

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| EvalNotQueued | 85 | EV-900 | the eval is in a state decided can't start from; carries `state` |
| EvalNotFound | 4 | EV-901 | nothing has the id in eval; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the itsMain of its superagent; the handler never runs |

## How to call

```sh
superagent eval decide --superagent <superagent> --eval <eval> --judgements <judgements>
```

HTTP: `POST /eval/decide` with the payload as JSON. SDK: `Sdk.eval.decide(payload)`.
