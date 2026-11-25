<!-- Generated from the blueprint. Do not edit. -->
# goal

Something an employee aims to do in an appraisal cycle, under one KRA.

Lives in the database.

## Fields

| field | value | description |
|---|---|---|
| id | id |  |
| company | company.id |  |
| employee | employee.id |  |
| appraisalCycle | appraisal-cycle.id |  |
| kra | kra.id |  |
| goalName | GoalName |  |
| progress | Progress |  |
| isGroup | schema | Whether the goal holds other goals, its progress following theirs (HRMS's `is_group`). |
| parentGoal (optional) | goal.id |  |

## Machine

States: pending, inProgress, completed, archived, closed. A move from the wrong state is refused GoalNotPending (exit 40).

| move | from | to | emits |
|---|---|---|---|
| create | (creates) | pending, inProgress, completed | GoalCreated |
| updateProgress | pending, inProgress, completed, archived, closed | pending, inProgress, completed, archived, closed | GoalProgressUpdated |
| complete | pending, inProgress | completed | GoalCompleted |
| archive | pending, inProgress, closed | archived | GoalArchived |
| close | pending, inProgress, archived | closed | GoalClosed |
| unarchive | archived | pending, inProgress, completed | GoalUnarchived |
| reopen | closed | pending, inProgress, completed | GoalReopened |

## Events

- `GoalArchived`: carries goal (goal.id); emitted by the move archive
- `GoalClosed`: carries goal (goal.id); emitted by the move close
- `GoalCompleted`: carries goal (goal.id); emitted by the move complete
- `GoalCreated`: carries goal (goal.id), employee (goal.employee), kra (goal.kra); emitted by the move create
- `GoalProgressUpdated`: carries goal (goal.id); emitted by the move updateProgress
- `GoalReopened`: carries goal (goal.id); emitted by the move reopen
- `GoalUnarchived`: carries goal (goal.id); emitted by the move unarchive

## Operations

- [goal.archive](archive.md): Archive a goal: it no longer counts towards its parent or its appraisal.
- [goal.close](close.md): Close a goal, keeping its progress.
- [goal.complete](complete.md): Mark a goal completed, setting its progress to 100.
- [goal.create](create.md): Set an employee a goal in a cycle, under a KRA, perhaps under another of their goals.
- [goal.get](get.md): Read one goal by its id: company, employee, appraisalCycle, kra, goalName, progress, isGroup, state.
- [goal.list](list.md): List goals, oldest first, 50 to a page, filtered by appraisalCycle, employee.
- [goal.reopen](reopen.md): Reopen a closed goal: its status follows its progress again.
- [goal.unarchive](unarchive.md): Bring an archived goal back: its status follows its progress again.
- [goal.update-progress](update-progress.md): Set how far along a goal is, from 0 to 100.
