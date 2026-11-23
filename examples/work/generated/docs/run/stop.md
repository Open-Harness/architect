<!-- Generated from the blueprint. Do not edit. -->
# run.stop

Stop the run. A person's act, or the mission stopping.

**Who may call:** the owner of its mission.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| mission | run.mission |
| run | run.id |
| why | Note |

## Answer

(none)

## Move

`stop`: from running or waiting to stopped, emitting RunStopped.

## Steps

- `run.stop.record` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| RunNotRunning | 60 | RU-900 | the run is in a state stop can't start from; carries `state` |
| RunNotFound | 4 | RU-901 | nothing has the id in run; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its mission; the handler never runs |

## How to call

```sh
work run stop --mission <mission> --run <run> --why <why>
```

HTTP: `POST /run/stop` with the payload as JSON. SDK: `Sdk.run.stop(payload)`.
