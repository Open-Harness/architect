<!-- Generated from the blueprint. Do not edit. -->
# superagent.reap

Close the running Assignments whose executor is idle, so their seats come back once the Agent has said it closed.

**Who may call:** the system.

## Payload

| field | value |
|---|---|
| superagent | superagent.id |

## Answer

| field | value |
|---|---|
| reaped | uint |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| SuperagentNotFound | 4 | SU-901 | nothing has the id in superagent; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the system; the handler never runs |

## How to call

```sh
superagent superagent reap --superagent <superagent>
```

HTTP: `POST /superagent/reap` with the payload as JSON. SDK: `Sdk.superagent.reap(payload)`.
