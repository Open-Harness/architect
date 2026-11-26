<!-- Generated from the blueprint. Do not edit. -->
# goal.create

Set an employee a goal in a cycle, under a KRA, perhaps under another of their goals.

**Who may call:** the self of its employee, or the owner of its appraisalCycle.company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 400ms.

## Payload

| field | value | description |
|---|---|---|
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
| appraisal | appraisal.id |
| appraisalCycle | goal.appraisalCycle |

## Move

`create`: from nothing (it creates) to pending or inProgress or completed, emitting GoalCreated.

## Steps

- `goal.create.load` (database)
- `goal.create.insert` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| GoalCycleCompleted | 41 | GO-001 | declared in errors.ts |
| GoalEmployeeNotInCompany | 42 | GO-002 | declared in errors.ts |
| GoalOwnerHasLeft | 43 | GO-003 | declared in errors.ts |
| GoalKraNotInAppraisal | 44 | GO-004 | declared in errors.ts |
| ParentGoalMismatch | 45 | GO-005 | declared in errors.ts |
| ProgressOutOfRange | 46 | GO-006 | declared in errors.ts |
| ParentGoalNotGroup | 48 | GO-009 | declared in errors.ts |
| AppraisalAlreadyExists | 51 | AP-005 | another appraisal holds this employee and appraisal cycle; by the rule appraisal.oneAppraisalPerCycle |
| EmployeeNotFound | 4 | EM-901 | nothing has the id in employee; the handler never runs; carries `id` |
| AppraisalCycleNotFound | 4 | CY-901 | nothing has the id in appraisalCycle; the handler never runs; carries `id` |
| KraNotFound | 4 | KR-901 | nothing has the id in kra; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the self of its employee, or the owner of its appraisalCycle.company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### appraise a year

Starts from the world `a second feedback criteria`.

- **Olga sets herself a group goal under Quality, Ship v2.** `olga` (signed in) calls and sends employee the world's employee, appraisalCycle the last call's appraisalCycle, kra the world's kra, goalName `Ship v2`, progress { value: `0`, scale: 0 }, isGroup true, and gets back an answer matching `^gol_[0-9a-z]+$`.
- **and under it the API, done: Ship v2's progress follows it to 100.** `olga` (signed in) calls and sends employee the world's employee, appraisalCycle the last call's appraisalCycle, kra the world's kra, goalName `API`, progress { value: `100`, scale: 0 }, isGroup false, parentGoal the last call's goal, and is answered.
- **she adds the UI under Ship v2, half done.** `olga` (signed in) calls and sends employee the world's employee, appraisalCycle the last call's appraisalCycle, kra the world's kra, goalName `UI`, progress { value: `50`, scale: 0 }, isGroup false, parentGoal the last call's goal, and is answered.
- **Olga sets a Development goal at 40: it earns 16, and the total is 3.35.** `olga` (signed in) calls and sends employee the world's employee, appraisalCycle the last call's appraisalCycle, kra the world's otherKra, goalName `Refactoring`, progress { value: `40`, scale: 0 }, isGroup false, and is answered.

### run an appraisal cycle

Starts from the world `a three-person cycle`.

- **Olga may set a goal in Q1 2027 before it starts: HRMS refuses only a completed cycle.** `olga` (signed in) calls and sends employee the world's employee, appraisalCycle the world's threePersonCycle, kra the world's kra, goalName `Early start`, progress { value: `20`, scale: 0 }, isGroup false, and is answered.

### set and track goals

Starts from the world `a started manual cycle`.

- **Olga sets a group goal, Platform, typing 80: a group starts at 0.** `olga` (signed in) calls and sends employee the world's employee, appraisalCycle the world's appraisalCycle, kra the world's otherKra, goalName `Platform work`, progress { value: `80`, scale: 0 }, isGroup true, and gets back the world's appraisal.
- **under it, Design API, done at 100.** `olga` (signed in) calls and sends employee the world's employee, appraisalCycle the world's appraisalCycle, kra the world's otherKra, goalName `API design`, progress { value: `100`, scale: 0 }, isGroup false, parentGoal the last call's goal, and gets back an answer matching `^gol_[0-9a-z]+$`.
- **under Platform, Write docs at 25, in progress.** `olga` (signed in) calls and sends employee the world's employee, appraisalCycle the world's appraisalCycle, kra the world's otherKra, goalName `Docs writing`, progress { value: `25`, scale: 0 }, isGroup false, parentGoal the last call's goal, and gets back an answer matching `^gol_[0-9a-z]+$`.
- **under Platform, a group of its own, Guides.** `olga` (signed in) calls and sends employee the world's employee, appraisalCycle the world's appraisalCycle, kra the world's otherKra, goalName `Guides`, progress { value: `0`, scale: 0 }, isGroup true, parentGoal the last call's goal, and is answered.
- **under Guides, Guide one at 60.** `olga` (signed in) calls and sends employee the world's employee, appraisalCycle the world's appraisalCycle, kra the world's otherKra, goalName `First guide`, progress { value: `60`, scale: 0 }, isGroup false, parentGoal the last call's goal, and gets back the world's appraisal.
- **a goal can't go under Ship the ledger, which isn't a group.** `olga` (signed in) calls and sends employee the world's employee, appraisalCycle the world's appraisalCycle, kra the world's kra, goalName `Sub-ledger`, progress { value: `10`, scale: 0 }, isGroup false, parentGoal the last call's items 0 id, and is refused with ParentGoalNotGroup, GO-009.
- **progress over 100 is judged before that.** `olga` (signed in) calls and sends employee the world's employee, appraisalCycle the world's appraisalCycle, kra the world's kra, goalName `Sub-ledger`, progress { value: `10001`, scale: 2 }, isGroup false, parentGoal the last call's items 0 id, and is refused with ProgressOutOfRange, GO-006.
- **and so is progress below 0, at the top too.** `olga` (signed in) calls and sends employee the world's employee, appraisalCycle the world's appraisalCycle, kra the world's kra, goalName `Negative`, progress { value: `-1`, scale: 2 }, isGroup false, and is refused with ProgressOutOfRange, GO-006.
- **a child under another KRA than its parent's is refused, judged before its progress.** `olga` (signed in) calls and sends employee the world's employee, appraisalCycle the world's appraisalCycle, kra the world's kra, goalName `Wrong KRA`, progress { value: `101`, scale: 0 }, isGroup false, parentGoal the last call's items 1 id, and is refused with ParentGoalMismatch, GO-005.
- **and so is a child in another cycle.** `olga` (signed in) calls and sends employee the world's employee, appraisalCycle the world's manualCycle, kra the world's otherKra, goalName `Wrong cycle`, progress { value: `10`, scale: 0 }, isGroup false, parentGoal the last call's items 1 id, and is refused with ParentGoalMismatch, GO-005.
- **and Cy's own goal under Olga's Platform.** `cy` (signed in) calls and sends employee the world's secondEmployee, appraisalCycle the world's appraisalCycle, kra the world's otherKra, goalName `Borrowed`, progress { value: `10`, scale: 0 }, isGroup false, parentGoal the last call's items 1 id, and is refused with ParentGoalMismatch, GO-005.
- **a KRA of Acme Logistics isn't on Olga's appraisal, judged before a parent.** `olga` (signed in) calls and sends employee the world's employee, appraisalCycle the world's appraisalCycle, kra the world's outsideKra, goalName `Drive`, progress { value: `10`, scale: 0 }, isGroup false, parentGoal the last call's items 0 id, and is refused with GoalKraNotInAppraisal, GO-004.
- **Dee has no appraisal in H2 2026, so she can't set a goal in it.** `dee` (signed in) calls and sends employee the world's newHire, appraisalCycle the world's appraisalCycle, kra the world's kra, goalName `Settle in`, progress { value: `0`, scale: 0 }, isGroup false, and is refused with GoalKraNotInAppraisal, GO-004.
- **Ada can't set Bo a goal in Acme Trading's cycle: he works for Acme Logistics.** `ada` (role company.owner) calls and sends employee the world's outsider, appraisalCycle the world's appraisalCycle, kra the world's outsideKra, goalName `Drive`, progress { value: `0`, scale: 0 }, isGroup false, and is refused with GoalEmployeeNotInCompany, GO-002.
- **Bo is judged as outside Acme Trading before as a leaver.** `ada` (role company.owner) calls and sends employee the world's outsider, appraisalCycle the world's appraisalCycle, kra the world's outsideKra, goalName `Drive`, progress { value: `0`, scale: 0 }, isGroup false, and is refused with GoalEmployeeNotInCompany, GO-002.
- **a KRA of Acme Trading that Olga's appraisal doesn't hold is refused.** `olga` (signed in) calls and sends employee the world's employee, appraisalCycle the world's appraisalCycle, kra the last call's kra, goalName `Mentor`, progress { value: `0`, scale: 0 }, isGroup false, and is refused with GoalKraNotInAppraisal, GO-004.
- **Cy can't set Olga a goal.** `cy` (signed in) calls and sends employee the world's employee, appraisalCycle the world's appraisalCycle, kra the world's kra, goalName `Cy's idea`, progress { value: `0`, scale: 0 }, isGroup false, and is refused with NotAllowed, AR-001.
- **nor can Bo.** `bo` (signed in) calls and sends employee the world's employee, appraisalCycle the world's appraisalCycle, kra the world's kra, goalName `Bo's idea`, progress { value: `0`, scale: 0 }, isGroup false, and is refused with NotAllowed, AR-001.
- **but she can't set a new goal.** `cy` (signed in) calls and sends employee the world's secondEmployee, appraisalCycle the world's appraisalCycle, kra the world's kra, goalName `One more`, progress { value: `0`, scale: 0 }, isGroup false, and is refused with GoalOwnerHasLeft, GO-003.
- **her leaving is judged before a KRA that isn't on her appraisal.** `ada` (role company.owner) calls and sends employee the world's secondEmployee, appraisalCycle the world's appraisalCycle, kra the world's outsideKra, goalName `One more`, progress { value: `0`, scale: 0 }, isGroup false, and is refused with GoalOwnerHasLeft, GO-003.
- **Olga sets a goal at 0 in H1 2027: pending.** `olga` (signed in) calls and sends employee the world's employee, appraisalCycle the world's manualCycle, kra the world's kra, goalName `Idle`, progress { value: `0`, scale: 0 }, isGroup false, and is answered.
- **Olga sets a goal at 40: in progress.** `olga` (signed in) calls and sends employee the world's employee, appraisalCycle the world's manualCycle, kra the world's kra, goalName `Steady`, progress { value: `40`, scale: 0 }, isGroup false, and is answered.
- **Olga sets a goal at 100: completed.** `olga` (signed in) calls and sends employee the world's employee, appraisalCycle the world's manualCycle, kra the world's otherKra, goalName `Done already`, progress { value: `100`, scale: 0 }, isGroup false, and is answered.
- **Olga sets one at 50 and archives it.** `olga` (signed in) calls and sends employee the world's employee, appraisalCycle the world's manualCycle, kra the world's otherKra, goalName `Later`, progress { value: `50`, scale: 0 }, isGroup false, and is answered.
- **Olga sets one at 50 and closes it.** `olga` (signed in) calls and sends employee the world's employee, appraisalCycle the world's manualCycle, kra the world's otherKra, goalName `Closed early`, progress { value: `50`, scale: 0 }, isGroup false, and is answered.
- **a group typed at 150 starts at 0, pending.** `olga` (signed in) calls and sends employee the world's employee, appraisalCycle the world's manualCycle, kra the world's kra, goalName `Group`, progress { value: `150`, scale: 0 }, isGroup true, and is answered.
- **a group, Pair.** `olga` (signed in) calls and sends employee the world's employee, appraisalCycle the world's manualCycle, kra the world's kra, goalName `Pair`, progress { value: `0`, scale: 0 }, isGroup true, and is answered.
- **under it, Left at 40.** `olga` (signed in) calls and sends employee the world's employee, appraisalCycle the world's manualCycle, kra the world's kra, goalName `Left`, progress { value: `40`, scale: 0 }, isGroup false, parentGoal the last call's goal, and is answered.
- **under Pair, Right at 80.** `olga` (signed in) calls and sends employee the world's employee, appraisalCycle the world's manualCycle, kra the world's kra, goalName `Right`, progress { value: `80`, scale: 0 }, isGroup false, parentGoal the last call's items 6 id, and is answered.
- **a group, Outer.** `olga` (signed in) calls and sends employee the world's employee, appraisalCycle the world's manualCycle, kra the world's otherKra, goalName `Outer`, progress { value: `0`, scale: 0 }, isGroup true, and is answered.
- **under it, a group, Inner.** `olga` (signed in) calls and sends employee the world's employee, appraisalCycle the world's manualCycle, kra the world's otherKra, goalName `Inner`, progress { value: `0`, scale: 0 }, isGroup true, parentGoal the last call's goal, and is answered.
- **under Inner, Alpha at 60.** `olga` (signed in) calls and sends employee the world's employee, appraisalCycle the world's manualCycle, kra the world's otherKra, goalName `Alpha`, progress { value: `60`, scale: 0 }, isGroup false, parentGoal the last call's goal, and is answered.
- **under Inner, Beta at 0: Inner is 30.** `olga` (signed in) calls and sends employee the world's employee, appraisalCycle the world's manualCycle, kra the world's otherKra, goalName `Beta`, progress { value: `0`, scale: 0 }, isGroup false, parentGoal the last call's items 10 id, and is answered.
- **under Outer, Gamma at 100.** `olga` (signed in) calls and sends employee the world's employee, appraisalCycle the world's manualCycle, kra the world's otherKra, goalName `Gamma`, progress { value: `100`, scale: 0 }, isGroup false, parentGoal the last call's items 9 id, and is answered.
- **no goal is set in it now, judged before Bo's company.** `ada` (role company.owner) calls and sends employee the world's outsider, appraisalCycle the world's appraisalCycle, kra the world's outsideKra, goalName `Drive`, progress { value: `0`, scale: 0 }, isGroup false, and is refused with GoalCycleCompleted, GO-001.

## How to call

```sh
capxul goal create --employee <employee> --appraisalCycle <appraisalCycle> --kra <kra> --goalName <goalName> --progress <progress> --isGroup <isGroup> [--parentGoal <parentGoal>]
```

HTTP: `POST /goal/create` with the payload as JSON. SDK: `Sdk.goal.create(payload)`.
