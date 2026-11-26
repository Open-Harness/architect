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

## Worked examples

### give performance feedback

Starts from the world `a manual cycle draft`.

- **Cy's draft on Olga reads back: 0.8 × 5 × 70% and 0.7 × 5 × 30%, a total of 3.85.** `cy` (signed in) calls and sends id the world's feedbackDraft, and gets back [the world's company, the world's appraisal, the world's appraisalCycle, the world's employee, the world's secondEmployee, `Olga explains her designs clearly.`, [[the world's criteria, `70`, `0.8`], [the world's otherCriteria, `30`, `0.7`]], `3.85`, `draft`].
- **Ada reads it.** `ada` (role company.owner) calls and sends id the world's feedbackDraft, and gets back [the world's secondEmployee, `3.85`].
- **Olga can't read what Cy wrote of her.** `olga` (signed in) calls and sends id the world's feedbackDraft, and is refused with NotAllowed, AR-001.
- **nor can Dee.** `dee` (signed in) calls and sends id the world's feedbackDraft, and is refused with NotAllowed, AR-001.
- **nor Bo.** `bo` (signed in) calls and sends id the world's feedbackDraft, and is refused with NotAllowed, AR-001.
- **it reads back submitted, on the template's criteria in the template's order.** `dee` (signed in) calls and sends id the last call's employeePerformanceFeedback, and gets back [the world's company, the world's appraisal, the world's appraisalCycle, the world's employee, the world's newHire, `Steady work.`, [[the world's criteria, `70`, `0.2`], [the world's otherCriteria, `30`, `1`]], `2.2`, `submitted`].
- **it reads back submitted, about Olga.** `cy` (signed in) calls and sends id the last call's employeePerformanceFeedback, and gets back [the world's employee, the world's secondEmployee, `3`, `submitted`].

## How to call

```sh
capxul employee-performance-feedback get --id <id>
```

HTTP: `POST /employee-performance-feedback/get` with the payload as JSON. SDK: `Sdk.employee-performance-feedback.get(payload)`.
