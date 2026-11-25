<!-- Generated from the blueprint. Do not edit. -->
# employee-performance-feedback.submit

Submit your feedback, counting it in the appraisal's average.

**Who may call:** the self of its employeePerformanceFeedback.reviewer.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 300ms.

## Payload

| field | value |
|---|---|
| employeePerformanceFeedback | employee-performance-feedback.id |

## Answer

| field | value | description |
|---|---|---|
| employeePerformanceFeedback | employee-performance-feedback.id |  |
| avgFeedbackScore | appraisal.avgFeedbackScore | The average of the submitted feedback's scores, out of 5 (HRMS's `avg_feedback_score`). |

## Move

`submit`: from draft to submitted, emitting PerformanceFeedbackSubmitted.

## Steps

- `employee-performance-feedback.submit.load` (database)
- `employee-performance-feedback.submit.update` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| FeedbackCycleCompleted | 41 | PF-007 | declared in errors.ts |
| AppraisalAlreadyExists | 51 | AP-005 | another appraisal holds this employee and appraisal cycle; by the rule appraisal.oneAppraisalPerCycle |
| EmployeePerformanceFeedbackNotDraft | 40 | PF-900 | the employee-performance-feedback is in a state submit can't start from; carries `state` |
| NotAllowed | 3 | AR-001 | the caller isn't the self of its employeePerformanceFeedback.reviewer; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## How to call

```sh
capxul employee-performance-feedback submit --employeePerformanceFeedback <employeePerformanceFeedback>
```

HTTP: `POST /employee-performance-feedback/submit` with the payload as JSON. SDK: `Sdk.employee-performance-feedback.submit(payload)`.
