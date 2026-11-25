<!-- Generated from the blueprint. Do not edit. -->
# appraisal.self-rate

Rate yourself against each of your appraisal's criteria, from 0 to 1.

**Who may call:** the self of its appraisal.employee.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 200ms.

## Payload

| field | value |
|---|---|
| appraisal | appraisal.id |
| ratings | GivenRatings |

## Answer

| field | value | description |
|---|---|---|
| appraisal | appraisal.id |  |
| selfScore | appraisal.selfScore | The self ratings' score out of 5 (HRMS's `self_score`). |
| finalScore | appraisal.finalScore | The average of the three scores above (HRMS's `final_score`). |

## Move

`selfRate`: from draft to draft, emitting AppraisalSelfRated.

## Steps

- `appraisal.self-rate.load` (database)
- `appraisal.self-rate.update` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| SelfRatingsDontMatchCriteria | 49 | AP-009 | declared in errors.ts |
| SelfRatingOutOfRange | 50 | AP-010 | declared in errors.ts |
| AppraisalAlreadyExists | 51 | AP-005 | another appraisal holds this employee and appraisal cycle; by the rule appraisal.oneAppraisalPerCycle |
| AppraisalNotDraft | 40 | AP-900 | the appraisal is in a state selfRate can't start from; carries `state` |
| NotAllowed | 3 | AR-001 | the caller isn't the self of its appraisal.employee; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## How to call

```sh
capxul appraisal self-rate --appraisal <appraisal> --ratings <ratings>
```

HTTP: `POST /appraisal/self-rate` with the payload as JSON. SDK: `Sdk.appraisal.self-rate(payload)`.
