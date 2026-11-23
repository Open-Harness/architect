<!-- Generated from the blueprint. Do not edit. -->
# run.start

Start an agent on one task. The run claims the task until it ends.

**Who may call:** the owner of its mission.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 250ms.

## Payload

| field | value |
|---|---|
| mission | run.mission |
| task | run.task |
| agent | run.agent |
| model | run.model |
| budget | run.budget |

## Answer

| field | value |
|---|---|
| run | run.id |

## Move

`start`: from nothing (it creates) to running, emitting RunStarted.

## Steps

- `run.start.claim` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| MissionNotRunning | 60 | MS-002 | the run is in a state start can't start from; carries `state` |
| RunOverBudget | 61 | RU-001 | declared in errors.ts, carrying left |
| RunAgentCannot | 62 | RU-002 | declared in errors.ts |
| RunTaskClaimed | 63 | RU-003 | declared in errors.ts |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its mission; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## How to call

```sh
work run start --mission <mission> --task <task> --agent <agent> --model <model> --budget <budget>
```

HTTP: `POST /run/start` with the payload as JSON. SDK: `Sdk.run.start(payload)`.
