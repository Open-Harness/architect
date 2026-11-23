<!-- Generated from the blueprint. Do not edit. -->
# eval.due

One pass of the eval clock: batch each thread's waiting triggers into an eval, and expire the ones that ran out of time. Not armed again while paused.

**Who may call:** the system.

## Payload

| field | value |
|---|---|
| superagent | eval.superagent |

## Answer

| field | value |
|---|---|
| started | uint |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the system; the handler never runs |

## How to call

```sh
superagent eval due --superagent <superagent>
```

HTTP: `POST /eval/due` with the payload as JSON. SDK: `Sdk.eval.due(payload)`.
