<!-- Generated from the blueprint. Do not edit. -->
# goal.complete

Mark a goal completed, setting its progress to 100.

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

`complete`: from pending or inProgress to completed, emitting GoalCompleted.

## Steps

- `goal.complete.load` (database)
- `goal.complete.update` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| GoalCycleCompleted | 41 | GL-001 | declared in errors.ts |
| GoalIsGroup | 47 | GL-009 | declared in errors.ts |
| AppraisalAlreadyExists | 51 | AP-005 | another appraisal holds this employee and appraisal cycle; by the rule appraisal.oneAppraisalPerCycle |
| GoalNotPending | 40 | GL-900 | the goal is in a state complete can't start from; carries `state` |
| NotAllowed | 3 | AR-001 | the caller isn't the self of its goal.employee, or the owner of its goal.company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### set and track goals

Starts from the world `a started manual cycle`.

- **nor is it completed by hand.** `ada` (role company.owner) calls and sends goal the last call's items 1 id, and is refused with GoalIsGroup, GL-009.
- **Cy can't complete it.** `cy` (signed in) calls and sends goal the last call's goal, and is refused with NotAllowed, AR-001.
- **nor can Bo.** `bo` (signed in) calls and sends goal the last call's goal, and is refused with NotAllowed, AR-001.
- **Olga completes it.** `olga` (signed in) calls and sends goal the last call's goal, and is answered.
- **a completed goal can't be completed again.** `olga` (signed in) calls and sends goal the last call's items 1 id, and is refused with GoalNotPending, GL-900, carrying state `completed`.
- **nothing is completed, a group either.** `ada` (role company.owner) calls and sends goal the last call's items 1 id, and is refused with GoalCycleCompleted, GL-001.

## How to call

```sh
capxul goal complete --goal <goal>
```

HTTP: `POST /goal/complete` with the payload as JSON. SDK: `Sdk.goal.complete(payload)`.
