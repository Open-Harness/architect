<!-- Generated from the blueprint. Do not edit. -->
# superagent.fill

Start waiting Assignments, in line, while seats are free. Does nothing while paused.

**Who may call:** the system.

## Payload

| field | value |
|---|---|
| superagent | superagent.id |

## Answer

| field | value |
|---|---|
| started | uint |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| SuperagentNotFound | 4 | SU-901 | nothing has the id in superagent; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the system; the handler never runs |

## How to call

```sh
superagent superagent fill --superagent <superagent>
```

HTTP: `POST /superagent/fill` with the payload as JSON. SDK: `Sdk.superagent.fill(payload)`.
