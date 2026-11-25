<!-- Generated from the blueprint. Do not edit. -->
# goal.create

Set an employee a goal in a cycle, under a KRA, perhaps under another of their goals.

**Who may call:** the self of its employee, or the owner of its company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 400ms.

## Payload

| field | value | description |
|---|---|---|
| company | goal.company |  |
| employee | goal.employee |  |
| appraisalCycle | goal.appraisalCycle |  |
| kra | goal.kra |  |
| goalName | goal.goalName |  |
| progress | goal.progress |  |
| isGroup | goal.isGroup | Whether the goal holds other goals, its progress following theirs (HRMS's `is_group`). |
| parentGoal (optional) | goal.parentGoal |  |

## Answer

| field | value |
|---|---|
| goal | goal.id |

## Move

`create`: from nothing (it creates) to pending or inProgress or completed, emitting GoalCreated.

## Steps

- `goal.create.load` (database)
- `goal.create.insert` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| GoalCycleCompleted | 41 | GL-001 | declared in errors.ts |
| GoalEmployeeNotInCompany | 42 | GL-002 | declared in errors.ts |
| GoalOwnerHasLeft | 43 | GL-003 | declared in errors.ts |
| GoalKraNotInAppraisal | 44 | GL-004 | declared in errors.ts |
| ParentGoalMismatch | 45 | GL-005 | declared in errors.ts |
| ProgressOutOfRange | 46 | GL-006 | declared in errors.ts |
| ParentGoalNotGroup | 48 | GL-010 | declared in errors.ts |
| AppraisalAlreadyExists | 51 | AP-005 | another appraisal holds this employee and appraisal cycle; by the rule appraisal.oneAppraisalPerCycle |
| CompanyNotFound | 4 | CO-901 | nothing has the id in company; the handler never runs; carries `id` |
| EmployeeNotFound | 4 | EM-901 | nothing has the id in employee; the handler never runs; carries `id` |
| AppraisalCycleNotFound | 4 | CY-901 | nothing has the id in appraisalCycle; the handler never runs; carries `id` |
| KraNotFound | 4 | KR-901 | nothing has the id in kra; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the self of its employee, or the owner of its company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## How to call

```sh
capxul goal create --company <company> --employee <employee> --appraisalCycle <appraisalCycle> --kra <kra> --goalName <goalName> --progress <progress> --isGroup <isGroup> [--parentGoal <parentGoal>]
```

HTTP: `POST /goal/create` with the payload as JSON. SDK: `Sdk.goal.create(payload)`.
