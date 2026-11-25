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

## Worked examples

### set and track goals

Starts from the world `a started manual cycle`.

- **her appraisal's Quality scores 50, earning 15 of its 30: a total of 0.75 out of 5, and a final score of 0.25.** `olga` (signed in) calls and sends id the world's appraisal, and gets back [[[the world's kra, `30`, `50`, `15`], [the world's otherKra, `70`, `0`, `0`]], `0.75`, `0`, `0`, `0.25`, `draft`].
- **Development scores Platform's 61.67 alone, its only top goal, earning 43.17: a total of 2.91 and a final score of 0.97.** `ada` (role company.owner) calls and sends id the world's appraisal, and gets back [[[the world's kra, `30`, `50`, `15`], [the world's otherKra, `70`, `61.67`, `43.17`]], `2.91`, `0`, `0`, `0.97`, `draft`].
- **Development scores 80, earning 56: a total of 3.55 and a final score of 1.18.** `olga` (signed in) calls and sends id the world's appraisal, and gets back [[[the world's kra, `30`, `50`, `15`], [the world's otherKra, `70`, `80`, `56`]], `3.55`, `0`, `0`, `1.18`, `draft`].
- **Development counts it again: Platform 83.33, earning 58.33, a total of 3.67 and a final score of 1.22.** `olga` (signed in) calls and sends id the world's appraisal, and gets back [[[the world's kra, `30`, `50`, `15`], [the world's otherKra, `70`, `83.33`, `58.33`]], `3.67`, `0`, `0`, `1.22`, `draft`].
- **a closed goal still counts: Quality scores 100, earning 30, a total of 4.42 and a final score of 1.47.** `olga` (signed in) calls and sends id the world's appraisal, and gets back [[[the world's kra, `30`, `100`, `30`], [the world's otherKra, `70`, `83.33`, `58.33`]], `4.42`, `0`, `0`, `1.47`, `draft`].
- **Cy's appraisal scores her runbook's 50 under Development, earning 35: a total of 1.75 and a final score of 0.58.** `cy` (signed in) calls and sends id the world's secondAppraisal, and gets back [[[the world's kra, `30`, `0`, `0`], [the world's otherKra, `70`, `50`, `35`]], `1.75`, `0`, `0`, `0.58`, `draft`].
- **and her appraisal follows: 70 earns 49, a total of 2.45 and a final score of 0.82.** `ada` (role company.owner) calls and sends id the world's secondAppraisal, and gets back [[[the world's kra, `30`, `0`, `0`], [the world's otherKra, `70`, `70`, `49`]], `2.45`, `0`, `0`, `0.82`, `draft`].
- **Cy's Development has no goal counting now, and scores 0.** `ada` (role company.owner) calls and sends id the world's secondAppraisal, and gets back [[[the world's kra, `30`, `0`, `0`], [the world's otherKra, `70`, `0`, `0`]], `0`, `0`, `0`, `0`, `draft`].
- **H1 2027 is rated by hand, so none of these goals scores Olga's appraisal there.** `olga` (signed in) calls and sends id the world's manualAppraisal, and gets back [[[the world's kra, `30`, `0`, `0`], [the world's otherKra, `70`, `0`, `0`]], `0`, `0`, `0`, `0`, `draft`].
- **Olga's appraisal reads back submitted, as it stood.** `olga` (signed in) calls and sends id the world's appraisal, and gets back [[[the world's kra, `30`, `100`, `30`], [the world's otherKra, `70`, `83.33`, `58.33`]], `4.42`, `0`, `0`, `1.47`, `submitted`].

## How to call

```sh
capxul appraisal get --id <id>
```

HTTP: `POST /appraisal/get` with the payload as JSON. SDK: `Sdk.appraisal.get(payload)`.
