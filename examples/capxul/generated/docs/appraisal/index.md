<!-- Generated from the blueprint. Do not edit. -->
# appraisal

How one employee did over one appraisal cycle.

Lives in the database.

## Fields

| field | value | description |
|---|---|---|
| id | id |  |
| company | company.id |  |
| employee | employee.id |  |
| appraisalCycle | appraisal-cycle.id |  |
| appraisalTemplate | appraisal-template.id |  |
| kraEvaluationMethod | EvaluationMethod |  |
| kras | AppraisalKras |  |
| selfRatings | CriteriaRatings |  |
| totalScore | Score | The KRAs' score out of 5 (HRMS's `total_score`). |
| selfScore | Score | The self ratings' score out of 5 (HRMS's `self_score`). |
| avgFeedbackScore | Score | The average of the submitted feedback's scores, out of 5 (HRMS's `avg_feedback_score`). |
| finalScore | Score | The average of the three scores above (HRMS's `final_score`). |

## Machine

States: draft, submitted. A move from the wrong state is refused AppraisalNotDraft (exit 40).

| move | from | to | emits |
|---|---|---|---|
| create | (creates) | draft | AppraisalCreated |
| rate | draft | draft | AppraisalRated |
| selfRate | draft | draft | AppraisalSelfRated |
| submit | draft | submitted | AppraisalSubmitted |

## Invariants

- `appraisal.oneAppraisalPerCycle`: another appraisal holds this employee and appraisal cycle. Unique on employee, appraisalCycle, in every state; refused AppraisalAlreadyExists.

## Events

- `AppraisalCreated`: carries appraisal (appraisal.id), employee (appraisal.employee), appraisalCycle (appraisal.appraisalCycle); emitted by the move create
- `AppraisalRated`: carries appraisal (appraisal.id); emitted by the move rate
- `AppraisalSelfRated`: carries appraisal (appraisal.id); emitted by the move selfRate
- `AppraisalSubmitted`: carries appraisal (appraisal.id); emitted by the move submit

## Operations

- [appraisal.create](create.md): Make an employee's appraisal in a cycle, by a template.
- [appraisal.get](get.md): Read one appraisal by its id: company, employee, appraisalCycle, appraisalTemplate, kraEvaluationMethod, kras, selfRatings, totalScore, selfScore, avgFeedbackScore, finalScore, state.
- [appraisal.list](list.md): List appraisals, oldest first, 50 to a page, filtered by appraisalCycle, employee.
- [appraisal.rate](rate.md): Score each KRA of an appraisal by hand, from 0 to 5.
- [appraisal.self-rate](self-rate.md): Rate yourself against each of your appraisal's criteria, from 0 to 1.
- [appraisal.submit](submit.md): Submit an appraisal.
