<!-- Generated from the blueprint. Do not edit. -->
# input.delivered

The executor took the Input.

**Who may call:** the system.

## Payload

| field | value |
|---|---|
| input | input.id |

## Answer

(none)

## Move

`delivered`: from routed to delivered, emitting InputDelivered.

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| InputNotWaiting | 98 | IN-900 | the input is in a state delivered can't start from; carries `state` |
| InputNotFound | 4 | IN-901 | nothing has the id in input; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the system; the handler never runs |

## How to call

```sh
superagent input delivered --input <input>
```

HTTP: `POST /input/delivered` with the payload as JSON. SDK: `Sdk.input.delivered(payload)`.
