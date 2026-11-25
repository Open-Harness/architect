<!-- Generated from the blueprint. Do not edit. -->
# appraisal.get

Read one appraisal by its id: company, employee, appraisalCycle, appraisalTemplate, kraEvaluationMethod, kras, selfRatings, totalScore, selfScore, avgFeedbackScore, finalScore, state.

**Who may call:** the self of its employee, or the owner of its company.

**A read:** answered from the records, with no handler.

**Budget:** p95 50ms.

## Payload

| field | value |
|---|---|
| id | appraisal.id |

## Answer

| field | value | description |
|---|---|---|
| company | appraisal.company |  |
| employee | appraisal.employee |  |
| appraisalCycle | appraisal.appraisalCycle |  |
| appraisalTemplate | appraisal.appraisalTemplate |  |
| kraEvaluationMethod | appraisal.kraEvaluationMethod |  |
| kras | appraisal.kras |  |
| selfRatings | appraisal.selfRatings |  |
| totalScore | appraisal.totalScore | The KRAs' score out of 5 (HRMS's `total_score`). |
| selfScore | appraisal.selfScore | The self ratings' score out of 5 (HRMS's `self_score`). |
| avgFeedbackScore | appraisal.avgFeedbackScore | The average of the submitted feedback's scores, out of 5 (HRMS's `avg_feedback_score`). |
| finalScore | appraisal.finalScore | The average of the three scores above (HRMS's `final_score`). |
| state | text |  |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the self of its employee, or the owner of its company; the handler never runs |

## How to call

```sh
capxul appraisal get --id <id>
```

HTTP: `POST /appraisal/get` with the payload as JSON. SDK: `Sdk.appraisal.get(payload)`.
