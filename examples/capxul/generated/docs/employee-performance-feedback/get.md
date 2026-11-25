<!-- Generated from the blueprint. Do not edit. -->
# employee-performance-feedback.get

Read one employee-performance-feedback by its id: company, appraisal, appraisalCycle, employee, reviewer, feedback, ratings, totalScore, state.

**Who may call:** the self of its reviewer, or the owner of its company.

**A read:** answered from the records, with no handler.

**Budget:** p95 50ms.

## Payload

| field | value |
|---|---|
| id | employee-performance-feedback.id |

## Answer

| field | value | description |
|---|---|---|
| company | employee-performance-feedback.company |  |
| appraisal | employee-performance-feedback.appraisal |  |
| appraisalCycle | employee-performance-feedback.appraisalCycle |  |
| employee | employee-performance-feedback.employee | The employee the feedback is about. |
| reviewer | employee-performance-feedback.reviewer | The employee who gives it. |
| feedback | employee-performance-feedback.feedback |  |
| ratings | employee-performance-feedback.ratings |  |
| totalScore | employee-performance-feedback.totalScore | The ratings' score out of 5 (HRMS's `total_score`). |
| state | text |  |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the self of its reviewer, or the owner of its company; the handler never runs |

## How to call

```sh
capxul employee-performance-feedback get --id <id>
```

HTTP: `POST /employee-performance-feedback/get` with the payload as JSON. SDK: `Sdk.employee-performance-feedback.get(payload)`.
