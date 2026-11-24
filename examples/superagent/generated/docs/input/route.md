<!-- Generated from the blueprint. Do not edit. -->
# input.route

Send a waiting Input to its running executor, or queue the Assignment that will start one.

**Who may call:** the system.

## Payload

| field | value |
|---|---|
| ticket | input.ticket |

## Answer

| field | value |
|---|---|
| input | input.id |
| agent | agent.id |
| assignment | id |

## Move

`routed`: from waiting to routed, emitting InputRouted.

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| InputNotWaiting | 98 | IN-900 | the input is in a state routed can't start from; carries `state` |
| TicketNotFound | 4 | TI-901 | nothing has the id in ticket; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the system; the handler never runs |

## How to call

```sh
superagent input route --ticket <ticket>
```

HTTP: `POST /input/route` with the payload as JSON. SDK: `Sdk.input.route(payload)`.
