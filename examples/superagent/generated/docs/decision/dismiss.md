<!-- Generated from the blueprint. Do not edit. -->
# decision.dismiss

Set aside a decision a person disagrees with.

**Who may call:** anyone signed in.

## Payload

| field | value |
|---|---|
| decision | decision.id |

## Answer

(none)

## Move

`dismiss`: from recorded to dismissed, emitting DecisionDismissed.

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| DecisionNotRecorded | 86 | DE-900 | the decision is in a state dismiss can't start from; carries `state` |
| DecisionNotFound | 4 | DE-901 | nothing has the id in decision; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't anyone signed in; the handler never runs |

## How to call

```sh
superagent decision dismiss --decision <decision>
```

HTTP: `POST /decision/dismiss` with the payload as JSON. SDK: `Sdk.decision.dismiss(payload)`.
