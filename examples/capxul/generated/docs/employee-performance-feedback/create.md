<!-- Generated from the blueprint. Do not edit. -->
# employee-performance-feedback.create

Draft your feedback on a colleague's appraisal: what you think, and a rating for each criteria.

**Who may call:** the self of its reviewer.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 200ms.

## Payload

| field | value | description |
|---|---|---|
| appraisal | employee-performance-feedback.appraisal |  |
| reviewer | employee-performance-feedback.reviewer | The employee who gives it. |
| feedback | employee-performance-feedback.feedback |  |
| ratings | GivenRatings |  |

## Answer

| field | value | description |
|---|---|---|
| employeePerformanceFeedback | employee-performance-feedback.id |  |
| totalScore | employee-performance-feedback.totalScore | The ratings' score out of 5 (HRMS's `total_score`). |

## Move

`create`: from nothing (it creates) to draft, emitting PerformanceFeedbackDrafted.

## Steps

- `employee-performance-feedback.create.load` (database)
- `employee-performance-feedback.create.insert` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| FeedbackCycleCompleted | 41 | PF-007 | declared in errors.ts |
| FeedbackForOneself | 42 | PF-002 | declared in errors.ts |
| ReviewerNotInCompany | 43 | PF-003 | declared in errors.ts |
| ReviewerHasLeft | 44 | PF-004 | declared in errors.ts |
| FeedbackRatingsDontMatchCriteria | 45 | PF-005 | declared in errors.ts |
| FeedbackRatingOutOfRange | 46 | PF-006 | declared in errors.ts |
| AppraisalNotFound | 4 | AP-901 | nothing has the id in appraisal; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the self of its reviewer; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### appraise a year

Starts from the world `a second feedback criteria`.

- **Cy gives feedback on Olga's appraisal, 0.9 and 0.6: a total of 3.75.** `cy` (signed in) calls and sends appraisal the last call's appraisal, reviewer the world's secondEmployee, feedback `Ship v2 landed well.`, ratings [{ criteria: the world's criteria, rating: { value: `9`, scale: 1 } }, { criteria: the world's otherCriteria, rating: { value: `6`, scale: 1 } }], and gets back `3.75`.

### give performance feedback

Starts from the world `a manual cycle draft`.

- **Ada can't give feedback in Cy's name.** `ada` (role company.owner) calls and sends appraisal the world's appraisal, reviewer the world's secondEmployee, feedback `Steady work.`, ratings [{ criteria: the world's criteria, rating: { value: `1`, scale: 0 } }, { criteria: the world's otherCriteria, rating: { value: `1`, scale: 0 } }], and is refused with NotAllowed, AR-001.
- **nor can Dee.** `dee` (signed in) calls and sends appraisal the world's appraisal, reviewer the world's secondEmployee, feedback `Steady work.`, ratings [{ criteria: the world's criteria, rating: { value: `1`, scale: 0 } }, { criteria: the world's otherCriteria, rating: { value: `1`, scale: 0 } }], and is refused with NotAllowed, AR-001.
- **Olga can't give feedback on her own appraisal, judged before ratings that don't match.** `olga` (signed in) calls and sends appraisal the world's appraisal, reviewer the world's employee, feedback `Steady work.`, ratings [{ criteria: the world's criteria, rating: { value: `2`, scale: 0 } }], and is refused with FeedbackForOneself, PF-002.
- **Bo of Acme Logistics can't give feedback on Acme Trading's appraisal, judged before ratings that don't match.** `bo` (signed in) calls and sends appraisal the world's appraisal, reviewer the world's outsider, feedback `Steady work.`, ratings [{ criteria: the world's criteria, rating: { value: `2`, scale: 0 } }], and is refused with ReviewerNotInCompany, PF-003.
- **ratings missing a criteria are refused, even out of range.** `dee` (signed in) calls and sends appraisal the world's appraisal, reviewer the world's newHire, feedback `Steady work.`, ratings [{ criteria: the world's criteria, rating: { value: `2`, scale: 0 } }], and is refused with FeedbackRatingsDontMatchCriteria, PF-005.
- **and so are ratings naming a criteria twice.** `dee` (signed in) calls and sends appraisal the world's appraisal, reviewer the world's newHire, feedback `Steady work.`, ratings [{ criteria: the world's criteria, rating: { value: `5`, scale: 1 } }, { criteria: the world's criteria, rating: { value: `5`, scale: 1 } }], and is refused with FeedbackRatingsDontMatchCriteria, PF-005.
- **and a criteria of Acme Logistics.** `dee` (signed in) calls and sends appraisal the world's appraisal, reviewer the world's newHire, feedback `Steady work.`, ratings [{ criteria: the world's criteria, rating: { value: `5`, scale: 1 } }, { criteria: the world's outsideCriteria, rating: { value: `5`, scale: 1 } }], and is refused with FeedbackRatingsDontMatchCriteria, PF-005.
- **and every criteria with one more.** `dee` (signed in) calls and sends appraisal the world's appraisal, reviewer the world's newHire, feedback `Steady work.`, ratings [{ criteria: the world's criteria, rating: { value: `5`, scale: 1 } }, { criteria: the world's otherCriteria, rating: { value: `5`, scale: 1 } }, { criteria: the world's outsideCriteria, rating: { value: `5`, scale: 1 } }], and is refused with FeedbackRatingsDontMatchCriteria, PF-005.
- **a rating over 1 is refused.** `dee` (signed in) calls and sends appraisal the world's appraisal, reviewer the world's newHire, feedback `Steady work.`, ratings [{ criteria: the world's criteria, rating: { value: `101`, scale: 2 } }, { criteria: the world's otherCriteria, rating: { value: `5`, scale: 1 } }], and is refused with FeedbackRatingOutOfRange, PF-006.
- **and one below 0.** `dee` (signed in) calls and sends appraisal the world's appraisal, reviewer the world's newHire, feedback `Steady work.`, ratings [{ criteria: the world's criteria, rating: { value: `5`, scale: 1 } }, { criteria: the world's otherCriteria, rating: { value: `-1`, scale: 2 } }], and is refused with FeedbackRatingOutOfRange, PF-006.
- **Dee rates Olga 0.2 and 1, in the other order: 0.7 and 1.5, a total of 2.2.** `dee` (signed in) calls and sends appraisal the world's appraisal, reviewer the world's newHire, feedback `Steady work.`, ratings [{ criteria: the world's otherCriteria, rating: { value: `1`, scale: 0 } }, { criteria: the world's criteria, rating: { value: `2`, scale: 1 } }], and gets back [the last call's employeePerformanceFeedback, `2.2`] and gets back an answer matching `^epf_[0-9a-z]+$`.
- **Cy may give Olga a second feedback, 1 and 0.5: a total of 4.25.** `cy` (signed in) calls and sends appraisal the world's appraisal, reviewer the world's secondEmployee, feedback `Steady work.`, ratings [{ criteria: the world's criteria, rating: { value: `1`, scale: 0 } }, { criteria: the world's otherCriteria, rating: { value: `5`, scale: 1 } }], and gets back `4.25`.
- **and Cy gives feedback on it.** `cy` (signed in) calls and sends appraisal the last call's appraisal, reviewer the world's secondEmployee, feedback `Early thoughts.`, ratings [{ criteria: the world's criteria, rating: { value: `6`, scale: 1 } }, { criteria: the world's otherCriteria, rating: { value: `6`, scale: 1 } }], and gets back `3`.
- **but she starts no new feedback, judged before ratings that don't match.** `dee` (signed in) calls and sends appraisal the world's appraisal, reviewer the world's newHire, feedback `Steady work.`, ratings [{ criteria: the world's criteria, rating: { value: `2`, scale: 0 } }], and is refused with ReviewerHasLeft, PF-004.
- **Bo is judged as outside Acme Trading before as a leaver.** `bo` (signed in) calls and sends appraisal the world's appraisal, reviewer the world's outsider, feedback `Steady work.`, ratings [{ criteria: the world's criteria, rating: { value: `1`, scale: 0 } }, { criteria: the world's otherCriteria, rating: { value: `1`, scale: 0 } }], and is refused with ReviewerNotInCompany, PF-003.
- **nor any new feedback given there, judged before ratings that don't match.** `cy` (signed in) calls and sends appraisal the world's manualAppraisal, reviewer the world's secondEmployee, feedback `Late.`, ratings [{ criteria: the world's criteria, rating: { value: `2`, scale: 0 } }], and is refused with FeedbackCycleCompleted, PF-007.
- **the completed cycle is judged before feedback on oneself.** `olga` (signed in) calls and sends appraisal the world's manualAppraisal, reviewer the world's employee, feedback `Late.`, ratings [{ criteria: the world's criteria, rating: { value: `1`, scale: 0 } }, { criteria: the world's otherCriteria, rating: { value: `1`, scale: 0 } }], and is refused with FeedbackCycleCompleted, PF-007.
- **and before a reviewer who has left.** `dee` (signed in) calls and sends appraisal the world's manualAppraisal, reviewer the world's newHire, feedback `Late.`, ratings [{ criteria: the world's criteria, rating: { value: `1`, scale: 0 } }, { criteria: the world's otherCriteria, rating: { value: `1`, scale: 0 } }], and is refused with FeedbackCycleCompleted, PF-007.
- **and a reviewer of Acme Logistics.** `bo` (signed in) calls and sends appraisal the world's manualAppraisal, reviewer the world's outsider, feedback `Late.`, ratings [{ criteria: the world's criteria, rating: { value: `1`, scale: 0 } }, { criteria: the world's otherCriteria, rating: { value: `1`, scale: 0 } }], and is refused with FeedbackCycleCompleted, PF-007.

## How to call

```sh
capxul employee-performance-feedback create --appraisal <appraisal> --reviewer <reviewer> --feedback <feedback> --ratings <ratings>
```

HTTP: `POST /employee-performance-feedback/create` with the payload as JSON. SDK: `Sdk.employee-performance-feedback.create(payload)`.
