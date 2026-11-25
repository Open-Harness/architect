<!-- Generated from the blueprint. Do not edit. -->
# goal.get

Read one goal by its id: company, employee, appraisalCycle, kra, goalName, progress, isGroup, parentGoal, state.

**Who may call:** the self of its employee, or the owner of its company.

**A read:** answered from the records, with no handler.

**Budget:** p95 50ms.

## Payload

| field | value |
|---|---|
| id | goal.id |

## Answer

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
| state | text |  |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the self of its employee, or the owner of its company; the handler never runs |

## How to call

```sh
capxul goal get --id <id>
```

HTTP: `POST /goal/get` with the payload as JSON. SDK: `Sdk.goal.get(payload)`.
