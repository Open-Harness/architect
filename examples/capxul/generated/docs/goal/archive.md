<!-- Generated from the blueprint. Do not edit. -->
# goal.archive

Archive a goal: it no longer counts towards its parent or its appraisal.

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

`archive`: from pending or inProgress or closed to archived, emitting GoalArchived.

## Steps

- `goal.archive.load` (database)
- `goal.archive.update` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| GoalCycleCompleted | 41 | GL-001 | declared in errors.ts |
| GoalIsGroup | 47 | GL-009 | declared in errors.ts |
| AppraisalAlreadyExists | 51 | AP-005 | another appraisal holds this employee and appraisal cycle; by the rule appraisal.oneAppraisalPerCycle |
| GoalNotPending | 40 | GL-900 | the goal is in a state archive can't start from; carries `state` |
| NotAllowed | 3 | AR-001 | the caller isn't the self of its goal.employee, or the owner of its goal.company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### set and track goals

Starts from the world `a started manual cycle`.

- **nor archived.** `ada` (role company.owner) calls and sends goal the last call's items 1 id, and is refused with GoalIsGroup, GL-009.
- **Cy can't archive Olga's Write docs.** `cy` (signed in) calls and sends goal the last call's items 3 id, and is refused with NotAllowed, AR-001.
- **nor can Bo.** `bo` (signed in) calls and sends goal the last call's items 3 id, and is refused with NotAllowed, AR-001.
- **Olga archives Write docs.** `olga` (signed in) calls and sends goal the last call's items 3 id, and is answered.
- **Ada archives the runbook.** `ada` (role company.owner) calls and sends goal the world's secondGoal, and is answered.
- **Olga archives it from pending.** `olga` (signed in) calls and sends goal the last call's goal, and is answered.
- **archives it again from closed.** `olga` (signed in) calls and sends goal the last call's goal, and is answered.
- **she archives it from in progress.** `olga` (signed in) calls and sends goal the last call's goal, and is answered.
- **nor archived.** `olga` (signed in) calls and sends goal the last call's items 1 id, and is refused with GoalNotPending, GL-900, carrying state `completed`.
- **archived.** `olga` (signed in) calls and sends goal the last call's goal, and is answered.
- **nothing archived.** `ada` (role company.owner) calls and sends goal the last call's items 5 id, and is refused with GoalCycleCompleted, GL-001.

## How to call

```sh
capxul goal archive --goal <goal>
```

HTTP: `POST /goal/archive` with the payload as JSON. SDK: `Sdk.goal.archive(payload)`.
