<!-- Generated from the blueprint. Do not edit. -->
# input.requeue

Put a refused or failed Input back to waiting, after a short wait that grows with each refusal.

**Who may call:** the system.

## Payload

| field | value |
|---|---|
| input | input.id |

## Answer

(none)

## Move

`requeued`: from routed or failed to waiting, emitting InputStored.

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| InputNotWaiting | 98 | IN-900 | the input is in a state requeued can't start from; carries `state` |
| InputNotFound | 4 | IN-901 | nothing has the id in input; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the system; the handler never runs |

## How to call

```sh
superagent input requeue --input <input>
```

HTTP: `POST /input/requeue` with the payload as JSON. SDK: `Sdk.input.requeue(payload)`.
