<!-- Generated from the blueprint. Do not edit. -->
# goal.roll-up

Bring a group goal's status up to date with the progress its children have rolled up.

**Who may call:** the self of its goal.employee, or the owner of its goal.company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 200ms.

## Payload

| field | value |
|---|---|
| goal | goal.id |

## Answer

| field | value |
|---|---|
| goal | goal.id |
| progress | goal.progress |
| appraisalCycle | goal.appraisalCycle |

## Move

`rollUp`: from pending or inProgress or completed to pending or inProgress or completed, emitting GoalRolledUp.

## Steps

- `goal.roll-up.load` (database)
- `goal.roll-up.update` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| GoalCycleCompleted | 41 | GO-001 | declared in errors.ts |
| GoalNotGroup | 49 | GO-008 | declared in errors.ts |
| GoalNotPending | 40 | GO-900 | the goal is in a state rollUp can't start from; carries `state` |
| NotAllowed | 3 | AR-001 | the caller isn't the self of its goal.employee, or the owner of its goal.company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### appraise a year

Starts from the world `a second feedback criteria`.

- **she rolls it up: completed.** `olga` (signed in) calls and sends goal the last call's items 0 id, and is answered.
- **until Olga rolls it up: in progress.** `olga` (signed in) calls and sends goal the last call's items 0 id, and is answered.

### set and track goals

Starts from the world `a started manual cycle`.

- **Cy can't roll up Olga's Platform.** `cy` (signed in) calls and sends goal the last call's items 1 id, and is refused with NotAllowed, AR-001.
- **nor can Bo.** `bo` (signed in) calls and sends goal the last call's items 1 id, and is refused with NotAllowed, AR-001.
- **a goal that isn't a group isn't rolled up.** `olga` (signed in) calls and sends goal the last call's items 2 id, and is refused with GoalNotGroup, GO-008.
- **Olga rolls Platform up: completed, at 100.** `olga` (signed in) calls and sends goal the last call's items 1 id, and gets back `100`.
- **Ada rolls it up: back in progress.** `ada` (role company.owner) calls and sends goal the last call's items 1 id, and gets back `62.5`.
- **Olga rolls Guides up: in progress.** `olga` (signed in) calls and sends goal the last call's items 4 id, and is answered.
- **rolled up with no children, it stays pending.** `olga` (signed in) calls and sends goal the last call's goal, and gets back `0`.
- **rolled up, Pair is in progress.** `olga` (signed in) calls and sends goal the last call's items 6 id, and gets back `60`.
- **Olga rolls Inner up: in progress.** `olga` (signed in) calls and sends goal the last call's items 10 id, and is answered.
- **and rolls Outer up at 65: in progress.** `olga` (signed in) calls and sends goal the last call's items 9 id, and gets back `65`.
- **no group is rolled up.** `olga` (signed in) calls and sends goal the last call's items 1 id, and is refused with GoalCycleCompleted, GO-001.
- **and the cycle is judged before a goal that isn't a group.** `olga` (signed in) calls and sends goal the last call's items 5 id, and is refused with GoalCycleCompleted, GO-001.

## How to call

```sh
capxul goal roll-up --goal <goal>
```

HTTP: `POST /goal/roll-up` with the payload as JSON. SDK: `Sdk.goal.roll-up(payload)`.
