<!-- Generated from the blueprint. Do not edit. -->
# run.report

Say how the run is going. It moves no card.

**Who may call:** the owner of its mission.

**Budget:** p95 100ms.

## Payload

| field | value |
|---|---|
| mission | run.mission |
| run | run.id |
| report | Report |
| note | Note |

## Answer

(none)

## Move

`report`: from running or waiting to running or waiting, emitting RunReported.

## Steps

- `run.report.record` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| RunNotRunning | 60 | RU-900 | the run is in a state report can't start from; carries `state` |
| RunNotFound | 4 | RU-901 | nothing has the id in run; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its mission; the handler never runs |

## How to call

```sh
work run report --mission <mission> --run <run> --report <report> --note <note>
```

HTTP: `POST /run/report` with the payload as JSON. SDK: `Sdk.run.report(payload)`.
