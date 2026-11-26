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
| appraisal | appraisal.id |  |

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

## Worked examples

### appraise a year

Starts from the world `a second feedback criteria`.

- **and submits it.** `cy` (signed in) calls and sends employeePerformanceFeedback the last call's employeePerformanceFeedback, and gets back `3.75`.

### give performance feedback

Starts from the world `a manual cycle draft`.

- **Cy can't submit Dee's.** `cy` (signed in) calls and sends employeePerformanceFeedback the last call's employeePerformanceFeedback, and is refused with NotAllowed, AR-001.
- **nor can Ada.** `ada` (role company.owner) calls and sends employeePerformanceFeedback the last call's employeePerformanceFeedback, and is refused with NotAllowed, AR-001.
- **Dee submits it: the average is 2.2, and Olga's final score 0.73.** `dee` (signed in) calls and sends employeePerformanceFeedback the last call's employeePerformanceFeedback, and gets back [`2.2`, the world's appraisal].
- **it can't be submitted twice.** `dee` (signed in) calls and sends employeePerformanceFeedback the last call's employeePerformanceFeedback, and is refused with EmployeePerformanceFeedbackNotDraft, PF-900, carrying state `submitted`.
- **Olga can't submit Cy's draft.** `olga` (signed in) calls and sends employeePerformanceFeedback the world's feedbackDraft, and is refused with NotAllowed, AR-001.
- **nor can Bo.** `bo` (signed in) calls and sends employeePerformanceFeedback the world's feedbackDraft, and is refused with NotAllowed, AR-001.
- **Cy submits hers: the average of 2.2 and 3.85 is 3.03 (3.025, rounded up), and the final score 1.01.** `cy` (signed in) calls and sends employeePerformanceFeedback the world's feedbackDraft, and gets back [the world's feedbackDraft, `3.03`, the world's appraisal].
- **submitted, it averages with the other two: 10.3 ÷ 3 is 3.43, and the final score 1.14.** `cy` (signed in) calls and sends employeePerformanceFeedback the last call's employeePerformanceFeedback, and gets back `3.43`.
- **and submits it before the cycle starts: the average of this appraisal's one feedback is 3.** `cy` (signed in) calls and sends employeePerformanceFeedback the last call's employeePerformanceFeedback, and gets back `3`.
- **she may still submit her draft on Cy: 0.5 and 0.5, a total and average of 2.5.** `dee` (signed in) calls and sends employeePerformanceFeedback the world's deeDraft, and gets back [`2.5`, the world's secondAppraisal].
- **Cy's draft there can't be submitted now.** `cy` (signed in) calls and sends employeePerformanceFeedback the world's manualDraft, and is refused with FeedbackCycleCompleted, PF-007.

## How to call

```sh
capxul employee-performance-feedback submit --employeePerformanceFeedback <employeePerformanceFeedback>
```

HTTP: `POST /employee-performance-feedback/submit` with the payload as JSON. SDK: `Sdk.employee-performance-feedback.submit(payload)`.
