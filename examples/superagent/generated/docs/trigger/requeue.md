<!-- Generated from the blueprint. Do not edit. -->
# trigger.requeue

Put a trigger back for evaluation.

**Who may call:** the itsMain of its superagent.

## Payload

| field | value |
|---|---|
| superagent | trigger.superagent |
| trigger | trigger.id |

## Answer

(none)

## Move

`requeue`: from stored to stored, emitting TriggerRequeued.

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| TriggerNotStored | 83 | TR-900 | the trigger is in a state requeue can't start from; carries `state` |
| TriggerNotFound | 4 | TR-901 | nothing has the id in trigger; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the itsMain of its superagent; the handler never runs |

## How to call

```sh
superagent trigger requeue --superagent <superagent> --trigger <trigger>
```

HTTP: `POST /trigger/requeue` with the payload as JSON. SDK: `Sdk.trigger.requeue(payload)`.
