<!-- Generated from the blueprint. Do not edit. -->
# goal.update-progress

Set how far along a goal is, from 0 to 100.

**Who may call:** the self of its goal.employee, or the owner of its goal.company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 400ms.

## Payload

| field | value |
|---|---|
| goal | goal.id |
| progress | goal.progress |

## Answer

| field | value |
|---|---|
| goal | goal.id |
| progress | goal.progress |

## Move

`updateProgress`: from pending or inProgress or completed to pending or inProgress or completed, emitting GoalProgressUpdated.

## Steps

- `goal.update-progress.load` (database)
- `goal.update-progress.update` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| GoalCycleCompleted | 41 | GL-001 | declared in errors.ts |
| GoalIsGroup | 47 | GL-009 | declared in errors.ts |
| ProgressOutOfRange | 46 | GL-006 | declared in errors.ts |
| AppraisalAlreadyExists | 51 | AP-005 | another appraisal holds this employee and appraisal cycle; by the rule appraisal.oneAppraisalPerCycle |
| GoalNotPending | 40 | GL-900 | the goal is in a state updateProgress can't start from; carries `state` |
| NotAllowed | 3 | AR-001 | the caller isn't the self of its goal.employee, or the owner of its goal.company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## How to call

```sh
capxul goal update-progress --goal <goal> --progress <progress>
```

HTTP: `POST /goal/update-progress` with the payload as JSON. SDK: `Sdk.goal.update-progress(payload)`.
