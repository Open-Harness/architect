<!-- Generated from the blueprint. Do not edit. -->
# goal.get

Read one goal by its id: company, employee, appraisalCycle, kra, goalName, progress, isGroup, state.

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
| state | text |  |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the self of its employee, or the owner of its company; the handler never runs |

## Worked examples

### set and track goals

Starts from the world `a started manual cycle`.

- **Olga's goal reads back as she set it, pending at 0.** `olga` (signed in) calls and sends id the world's goal, and gets back [the world's company, the world's employee, the world's appraisalCycle, the world's kra, `Ship the ledger`, `0`, false, `pending`].
- **Ada reads it too.** `ada` (role company.owner) calls and sends id the world's goal, and gets back `Ship the ledger`.
- **Cy can't read Olga's goal.** `cy` (signed in) calls and sends id the world's goal, and is refused with NotAllowed, AR-001.
- **nor can Bo.** `bo` (signed in) calls and sends id the world's goal, and is refused with NotAllowed, AR-001.
- **Platform follows its one child to 100, completed.** `olga` (signed in) calls and sends id the last call's parentGoal, and gets back [`Platform`, `100`, `completed`].
- **Platform is now 62.5, in progress.** `olga` (signed in) calls and sends id the last call's parentGoal, and gets back [`62.5`, `inProgress`].
- **Olga's progress doesn't touch Cy's: Cy's goal still reads 50.** `cy` (signed in) calls and sends id the world's secondGoal, and gets back [`50`, `inProgress`].
- **completing set its progress to 100.** `olga` (signed in) calls and sends id the last call's goal, and gets back [`100`, `completed`].
- **it reads back at 0, a group.** `olga` (signed in) calls and sends id the last call's goal, and gets back [`0`, true, `pending`].

## How to call

```sh
capxul goal get --id <id>
```

HTTP: `POST /goal/get` with the payload as JSON. SDK: `Sdk.goal.get(payload)`.
