<!-- Generated from the blueprint. Do not edit. -->
# input.delivery-failed

The outbox gave up telling the executor.

**Who may call:** the system.

## Payload

| field | value |
|---|---|
| input | input.id |

## Answer

(none)

## Move

`failed`: from routed to failed, emitting InputFailed.

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| InputNotWaiting | 98 | IN-900 | the input is in a state failed can't start from; carries `state` |
| InputNotFound | 4 | IN-901 | nothing has the id in input; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the system; the handler never runs |

## How to call

```sh
superagent input delivery-failed --input <input>
```

HTTP: `POST /input/delivery-failed` with the payload as JSON. SDK: `Sdk.input.delivery-failed(payload)`.
