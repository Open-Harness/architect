<!-- Generated from the blueprint. Do not edit. -->
# employee-performance-feedback

What one colleague thinks of an employee's work, for their appraisal.

Lives in the database.

## Fields

| field | value | description |
|---|---|---|
| id | id |  |
| company | company.id |  |
| appraisal | appraisal.id |  |
| appraisalCycle | appraisal-cycle.id |  |
| employee | employee.id | The employee the feedback is about. |
| reviewer | employee.id | The employee who gives it. |
| feedback | FeedbackText |  |
| ratings | CriteriaRatings |  |
| totalScore | Score | The ratings' score out of 5 (HRMS's `total_score`). |

## Machine

States: draft, submitted. A move from the wrong state is refused EmployeePerformanceFeedbackNotDraft (exit 40).

| move | from | to | emits |
|---|---|---|---|
| create | (creates) | draft | PerformanceFeedbackDrafted |
| submit | draft | submitted | PerformanceFeedbackSubmitted |

## Events

- `PerformanceFeedbackDrafted`: carries employeePerformanceFeedback (employee-performance-feedback.id), appraisal (employee-performance-feedback.appraisal), reviewer (employee-performance-feedback.reviewer: The employee who gives it.), totalScore (employee-performance-feedback.totalScore: The ratings' score out of 5 (HRMS's `total_score`).); emitted by the move create
- `PerformanceFeedbackSubmitted`: carries employeePerformanceFeedback (employee-performance-feedback.id), appraisal (employee-performance-feedback.appraisal), totalScore (employee-performance-feedback.totalScore: The ratings' score out of 5 (HRMS's `total_score`).); emitted by the move submit

## Operations

- [employee-performance-feedback.create](create.md): Draft your feedback on a colleague's appraisal: what you think, and a rating for each criteria.
- [employee-performance-feedback.get](get.md): Read one employee-performance-feedback by its id: company, appraisal, appraisalCycle, employee, reviewer, feedback, ratings, totalScore, state.
- [employee-performance-feedback.submit](submit.md): Submit your feedback, counting it in the appraisal's average.
