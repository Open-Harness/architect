<!-- Generated from the blueprint. Do not edit. -->
# goal.unarchive

Bring an archived goal back: its status follows its progress again.

**Who may call:** the self of its goal.employee, or the owner of its goal.company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 400ms.

## Payload

| field | value |
|---|---|
| goal | goal.id |

## Answer

| field | value |
|---|---|
| goal | goal.id |

## Move

`unarchive`: from archived to pending or inProgress or completed, emitting GoalUnarchived.

## Steps

- `goal.unarchive.load` (database)
- `goal.unarchive.update` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| GoalCycleCompleted | 41 | GL-001 | declared in errors.ts |
| AppraisalAlreadyExists | 51 | AP-005 | another appraisal holds this employee and appraisal cycle; by the rule appraisal.oneAppraisalPerCycle |
| GoalNotPending | 40 | GL-900 | the goal is in a state unarchive can't start from; carries `state` |
| NotAllowed | 3 | AR-001 | the caller isn't the self of its goal.employee, or the owner of its goal.company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### set and track goals

Starts from the world `a started manual cycle`.

- **Cy can't unarchive Olga's.** `cy` (signed in) calls and sends goal the last call's items 3 id, and is refused with NotAllowed, AR-001.
- **Olga unarchives Write docs: at 90 it is in progress again.** `olga` (signed in) calls and sends goal the last call's items 3 id, and is answered.
- **unarchived at 0, it is pending.** `olga` (signed in) calls and sends goal the last call's goal, and is answered.
- **it can't be unarchived twice.** `olga` (signed in) calls and sends goal the last call's goal, and is refused with GoalNotPending, GL-900, carrying state `pending`.
- **unarchived at 40, it is in progress.** `olga` (signed in) calls and sends goal the last call's goal, and is answered.
- **unarchived at 100, it is completed.** `olga` (signed in) calls and sends goal the last call's goal, and is answered.
- **nothing unarchived.** `ada` (role company.owner) calls and sends goal the world's secondGoal, and is refused with GoalCycleCompleted, GL-001.

## How to call

```sh
capxul goal unarchive --goal <goal>
```

HTTP: `POST /goal/unarchive` with the payload as JSON. SDK: `Sdk.goal.unarchive(payload)`.
