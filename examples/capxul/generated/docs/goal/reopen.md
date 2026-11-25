<!-- Generated from the blueprint. Do not edit. -->
# goal.reopen

Reopen a closed goal: its status follows its progress again.

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

`reopen`: from closed to pending or inProgress or completed, emitting GoalReopened.

## Steps

- `goal.reopen.load` (database)
- `goal.reopen.update` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| GoalCycleCompleted | 41 | GL-001 | declared in errors.ts |
| AppraisalAlreadyExists | 51 | AP-005 | another appraisal holds this employee and appraisal cycle; by the rule appraisal.oneAppraisalPerCycle |
| GoalNotPending | 40 | GL-900 | the goal is in a state reopen can't start from; carries `state` |
| NotAllowed | 3 | AR-001 | the caller isn't the self of its goal.employee, or the owner of its goal.company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### set and track goals

Starts from the world `a started manual cycle`.

- **Cy can't reopen it.** `cy` (signed in) calls and sends goal the last call's goal, and is refused with NotAllowed, AR-001.
- **nor can Bo.** `bo` (signed in) calls and sends goal the last call's goal, and is refused with NotAllowed, AR-001.
- **reopened at 0, it is pending again.** `olga` (signed in) calls and sends goal the last call's goal, and is answered.
- **it can't be reopened while archived.** `olga` (signed in) calls and sends goal the last call's goal, and is refused with GoalNotPending, GL-900, carrying state `archived`.
- **reopened at 40, it is in progress.** `olga` (signed in) calls and sends goal the last call's goal, and is answered.
- **reopened at 100, it is completed.** `olga` (signed in) calls and sends goal the last call's goal, and is answered.
- **nothing reopened.** `ada` (role company.owner) calls and sends goal the world's goal, and is refused with GoalCycleCompleted, GL-001.

## How to call

```sh
capxul goal reopen --goal <goal>
```

HTTP: `POST /goal/reopen` with the payload as JSON. SDK: `Sdk.goal.reopen(payload)`.
