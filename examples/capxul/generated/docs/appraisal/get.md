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

### appraise a year

Starts from the world `a second feedback criteria`.

- **Ship v2 is at 85, the average of 100 and 70, so Quality scores 85 and earns 51: a total of 2.55.** `olga` (signed in) calls and sends id the last call's appraisal, and gets back [[[the world's kra, `60`, `85`, `51`], [the world's otherKra, `40`, `0`, `0`]], [[the world's criteria, `50`, `0`], [the world's otherCriteria, `50`, `0`]], [`2.55`, `0`, `0`, `0.85`], `draft`].
- **Olga's appraisal, to reach the cycle.** `olga` (signed in) calls and sends id the last call's appraisal, and gets back `3.87`.

### give performance feedback

Starts from the world `a manual cycle draft`.

- **a draft counts for nothing: Olga's appraisal has no feedback score.** `ada` (role company.owner) calls and sends id the world's appraisal, and gets back [`0`, `0`, `0`, `0`].
- **Olga's appraisal shows it.** `olga` (signed in) calls and sends id the world's appraisal, and gets back [`0`, `0`, `2.2`, `0.73`].
- **Olga's appraisal reads it back.** `olga` (signed in) calls and sends id the world's appraisal, and gets back [`0`, `0`, `3.43`, `1.14`].
- **Cy's own appraisal is untouched by feedback on Olga's: her Development goal at 50% earns 35, a total of 1.75.** `cy` (signed in) calls and sends id the world's secondAppraisal, and gets back [`1.75`, `0`, `0`, `0.58`].
- **Olga's Q3 2027 appraisal counts only its own feedback, not H2 2026's: a final score of 1.** `ada` (role company.owner) calls and sends id the last call's appraisal, and gets back [`0`, `0`, `3`, `1`].
- **Cy's appraisal shows it.** `cy` (signed in) calls and sends id the world's secondAppraisal, and gets back [`1.75`, `0`, `2.5`, `1.42`].
- **Olga's H1 2027 appraisal has no feedback score.** `olga` (signed in) calls and sends id the world's manualAppraisal, and gets back `0`.

### rate an appraisal

Starts from the world `a manual cycle draft`.

- **Olga's H1 2027 appraisal reads back by hand, every score 0.** `olga` (signed in) calls and sends id the world's manualAppraisal, and gets back [the world's company, the world's employee, the world's manualCycle, the world's appraisalTemplate, `Manual Rating`, [[the world's kra, `30`, `0`, `0`], [the world's otherKra, `70`, `0`, `0`]], [[the world's criteria, `70`, `0`], [the world's otherCriteria, `30`, `0`]], `0`, `0`, `0`, `0`, `draft`].
- **Cy can't read Olga's.** `cy` (signed in) calls and sends id the world's manualAppraisal, and is refused with NotAllowed, AR-001.
- **nor can Bo.** `bo` (signed in) calls and sends id the world's manualAppraisal, and is refused with NotAllowed, AR-001.
- **Quality earns 1.5 and Development 2.1, and the final score is 1.2.** `ada` (role company.owner) calls and sends id the world's manualAppraisal, and gets back [[[the world's kra, `30`, `5`, `1.5`], [the world's otherKra, `70`, `3`, `2.1`]], [[the world's criteria, `70`, `0`], [the world's otherCriteria, `30`, `0`]], `3.6`, `0`, `0`, `1.2`, `draft`].
- **they read back in the template's order.** `ada` (role company.owner) calls and sends id the world's manualAppraisal, and gets back [[[the world's kra, `30`, `5`, `1.5`], [the world's otherKra, `70`, `0`, `0`]]].
- **its lines read back rounded half up, 1.28 and 2.21, and the total stays 3.48.** `ada` (role company.owner) calls and sends id the world's manualAppraisal, and gets back [[[the world's kra, `30`, `4.25`, `1.28`], [the world's otherKra, `70`, `3.15`, `2.21`]], `3.48`].
- **her ratings read back on their criteria, and Ada's scores stand.** `olga` (signed in) calls and sends id the world's manualAppraisal, and gets back [[[the world's kra, `30`, `5`, `1.5`], [the world's otherKra, `70`, `3`, `2.1`]], [[the world's criteria, `70`, `0.8`], [the world's otherCriteria, `30`, `0.7`]], `3.6`, `3.85`, `0`, `2.48`, `draft`].
- **they read back in the template's order.** `olga` (signed in) calls and sends id the world's manualAppraisal, and gets back [[the world's criteria, `70`, `1`], [the world's otherCriteria, `30`, `0`]].
- **Cy's appraisal is untouched by Olga's.** `cy` (signed in) calls and sends id the world's secondManualAppraisal, and gets back [[[the world's kra, `30`, `0`, `0`], [the world's otherKra, `70`, `0`, `0`]], [[the world's criteria, `70`, `0`], [the world's otherCriteria, `30`, `0`]], `0`, `0`, `0`, `0`, `draft`].
- **it takes the cycle's company and method and the template's lines, every score 0.** `dee` (signed in) calls and sends id the last call's appraisal, and gets back [the world's company, the world's newHire, the world's manualCycle, `Manual Rating`, [[the world's kra, `30`, `0`, `0`], [the world's otherKra, `70`, `0`, `0`]], [[the world's criteria, `70`, `0`], [the world's otherCriteria, `30`, `0`]], `0`, `0`, `0`, `0`, `draft`].
- **it reads back submitted, every score as it stood.** `olga` (signed in) calls and sends id the world's manualAppraisal, and gets back [[[the world's kra, `30`, `5`, `1.5`], [the world's otherKra, `70`, `3`, `2.1`]], [[the world's criteria, `70`, `0.8`], [the world's otherCriteria, `30`, `0.7`]], `3.6`, `3.85`, `0`, `2.48`, `submitted`].

### run an appraisal cycle

Starts from the world `a three-person cycle`.

- **it reads back as Olga's.** `ada` (role company.owner) calls and sends id the last call's appraisal, and gets back the world's employee.

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
