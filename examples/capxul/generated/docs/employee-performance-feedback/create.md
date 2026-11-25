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

## How to call

```sh
capxul employee-performance-feedback create --appraisal <appraisal> --reviewer <reviewer> --feedback <feedback> --ratings <ratings>
```

HTTP: `POST /employee-performance-feedback/create` with the payload as JSON. SDK: `Sdk.employee-performance-feedback.create(payload)`.
