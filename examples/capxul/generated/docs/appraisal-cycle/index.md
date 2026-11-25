<!-- Generated from the blueprint. Do not edit. -->
# appraisal-cycle

A period a company appraises its people over, and whom it appraises by which template.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| company | company.id |
| cycleName | CycleName |
| startDate | Day |
| endDate | Day |
| kraEvaluationMethod | EvaluationMethod |
| appraisees | Appraisees |

## Machine

States: notStarted, inProgress, completed. A move from the wrong state is refused AppraisalCycleNotNotStarted (exit 40).

| move | from | to | emits |
|---|---|---|---|
| create | (creates) | notStarted | AppraisalCycleCreated |
| start | notStarted | inProgress | AppraisalCycleStarted |
| complete | inProgress | completed | AppraisalCycleCompleted |
| reopen | completed | inProgress | AppraisalCycleReopened |

## Invariants

- `appraisal-cycle.oneNamePerCompany`: another appraisal cycle holds this company and cycle name. Unique on company, cycleName, in every state; refused CycleNameTaken.

## Events

- `AppraisalCycleCompleted`: carries appraisalCycle (appraisal-cycle.id); emitted by the move complete
- `AppraisalCycleCreated`: carries appraisalCycle (appraisal-cycle.id), company (appraisal-cycle.company); emitted by the move create
- `AppraisalCycleReopened`: carries appraisalCycle (appraisal-cycle.id); emitted by the move reopen
- `AppraisalCycleStarted`: carries appraisalCycle (appraisal-cycle.id); emitted by the move start

## Operations

- [appraisal-cycle.complete](complete.md): Mark a cycle completed once every appraisal in it is submitted.
- [appraisal-cycle.create](create.md): Set up an appraisal cycle: its days, how its KRAs are scored, and who is appraised by which template.
- [appraisal-cycle.get](get.md): Read one appraisal-cycle by its id: company, cycleName, startDate, endDate, kraEvaluationMethod, appraisees, state.
- [appraisal-cycle.reopen](reopen.md): Put a completed cycle back in progress.
- [appraisal-cycle.start](start.md): Start a cycle, making an appraisal for each appraisee who has none yet.
