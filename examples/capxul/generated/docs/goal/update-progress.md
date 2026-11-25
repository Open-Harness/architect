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
| appraisal | appraisal.id |

## Move

`updateProgress`: from pending or inProgress or completed or archived or closed to pending or inProgress or completed or archived or closed, emitting GoalProgressUpdated.

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

## Worked examples

### appraise a year

Starts from the world `a second feedback criteria`.

- **she moves the UI to 70.** `olga` (signed in) calls and sends goal the last call's goal, progress { value: `70`, scale: 0 }, and gets back `70`.
- **and no longer move.** `olga` (signed in) calls and sends goal the last call's items 2 id, progress { value: `100`, scale: 0 }, and is refused with GoalCycleCompleted, GL-001.

### set and track goals

Starts from the world `a started manual cycle`.

- **Cy can't move Olga's progress.** `cy` (signed in) calls and sends goal the world's goal, progress { value: `50`, scale: 0 }, and is refused with NotAllowed, AR-001.
- **nor can Bo.** `bo` (signed in) calls and sends goal the world's goal, progress { value: `50`, scale: 0 }, and is refused with NotAllowed, AR-001.
- **Olga moves it to 50, and it is in progress.** `olga` (signed in) calls and sends goal the world's goal, progress { value: `50`, scale: 0 }, and gets back [the world's goal, `50`, the world's appraisal].
- **Platform's progress isn't set by hand.** `olga` (signed in) calls and sends goal the last call's items 1 id, progress { value: `90`, scale: 0 }, and is refused with GoalIsGroup, GL-009.
- **even out of range, the group is judged first.** `olga` (signed in) calls and sends goal the last call's items 1 id, progress { value: `150`, scale: 0 }, and is refused with GoalIsGroup, GL-009.
- **Write docs can't go over 100.** `olga` (signed in) calls and sends goal the last call's items 3 id, progress { value: `10001`, scale: 2 }, and is refused with ProgressOutOfRange, GL-006.
- **nor below 0.** `olga` (signed in) calls and sends goal the last call's items 3 id, progress { value: `-1`, scale: 0 }, and is refused with ProgressOutOfRange, GL-006.
- **an archived goal's progress still moves, to 90, and it stays archived.** `olga` (signed in) calls and sends goal the last call's goal, progress { value: `90`, scale: 0 }, and gets back [`90`, the world's appraisal].
- **its progress still moves, to 100, and it stays closed.** `olga` (signed in) calls and sends goal the world's goal, progress { value: `100`, scale: 0 }, and is answered.
- **she may still move a goal she already has, to 70.** `cy` (signed in) calls and sends goal the world's secondGoal, progress { value: `70`, scale: 0 }, and gets back [`70`, the world's secondAppraisal].
- **back to 0, it is pending.** `olga` (signed in) calls and sends goal the last call's goal, progress { value: `0`, scale: 0 }, and is answered.
- **at 99.99 it is still in progress.** `olga` (signed in) calls and sends goal the last call's goal, progress { value: `9999`, scale: 2 }, and is answered.
- **at 0.01 too.** `olga` (signed in) calls and sends goal the last call's goal, progress { value: `1`, scale: 2 }, and is answered.
- **but its progress moves back to 70, in progress.** `olga` (signed in) calls and sends goal the last call's items 1 id, progress { value: `70`, scale: 0 }, and is answered.
- **and up to 100, completed.** `olga` (signed in) calls and sends goal the last call's goal, progress { value: `100`, scale: 0 }, and is answered.
- **it reaches 100 while archived.** `olga` (signed in) calls and sends goal the last call's goal, progress { value: `100`, scale: 0 }, and is answered.
- **it reaches 100 while closed.** `olga` (signed in) calls and sends goal the last call's goal, progress { value: `100`, scale: 0 }, and is answered.
- **no progress moves.** `olga` (signed in) calls and sends goal the last call's items 5 id, progress { value: `70`, scale: 0 }, and is refused with GoalCycleCompleted, GL-001.
- **no group is judged before the cycle.** `olga` (signed in) calls and sends goal the last call's items 1 id, progress { value: `70`, scale: 0 }, and is refused with GoalCycleCompleted, GL-001.

## How to call

```sh
capxul goal update-progress --goal <goal> --progress <progress>
```

HTTP: `POST /goal/update-progress` with the payload as JSON. SDK: `Sdk.goal.update-progress(payload)`.
