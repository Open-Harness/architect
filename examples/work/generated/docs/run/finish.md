<!-- Generated from the blueprint. Do not edit. -->
# run.finish

The run pushed its branch. CI proves it; the run cannot close its own task.

**Who may call:** the owner of its mission.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| mission | run.mission |
| run | run.id |
| branch | Branch |

## Answer

(none)

## Move

`finish`: from running to finished, emitting RunFinished.

## Steps

- `run.finish.record` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| RunNotRunning | 60 | RU-900 | the run is in a state finish can't start from; carries `state` |
| RunNotFound | 4 | RU-901 | nothing has the id in run; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its mission; the handler never runs |

## How to call

```sh
work run finish --mission <mission> --run <run> --branch <branch>
```

HTTP: `POST /run/finish` with the payload as JSON. SDK: `Sdk.run.finish(payload)`.
