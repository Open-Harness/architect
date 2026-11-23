<!-- Generated from the blueprint. Do not edit. -->
# eval.delivered

Start an eval's clock when it is told to the main agent: a held hop, so a pause never starts it.

**Who may call:** the system.

## Payload

| field | value |
|---|---|
| eval | eval.id |

## Answer

(none)

## Move

`delivered`: from queued to delivered, emitting EvalDelivered.

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| EvalNotQueued | 85 | EV-900 | the eval is in a state delivered can't start from; carries `state` |
| EvalNotFound | 4 | EV-901 | nothing has the id in eval; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the system; the handler never runs |

## How to call

```sh
superagent eval delivered --eval <eval>
```

HTTP: `POST /eval/delivered` with the payload as JSON. SDK: `Sdk.eval.delivered(payload)`.
