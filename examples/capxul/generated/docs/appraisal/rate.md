<!-- Generated from the blueprint. Do not edit. -->
# appraisal.rate

Score each KRA of an appraisal by hand, from 0 to 5.

**Who may call:** the owner of its appraisal.company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 200ms.

## Payload

| field | value |
|---|---|
| appraisal | appraisal.id |
| scores | GivenScores |

## Answer

| field | value | description |
|---|---|---|
| appraisal | appraisal.id |  |
| totalScore | appraisal.totalScore | The KRAs' score out of 5 (HRMS's `total_score`). |
| finalScore | appraisal.finalScore | The average of the three scores above (HRMS's `final_score`). |

## Move

`rate`: from draft to draft, emitting AppraisalRated.

## Steps

- `appraisal.rate.load` (database)
- `appraisal.rate.update` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| AppraisalCycleCompleted | 43 | AP-003 | declared in errors.ts |
| NotRatedManually | 46 | AP-006 | declared in errors.ts |
| ScoresDontMatchKras | 47 | AP-007 | declared in errors.ts |
| KraScoreOutOfRange | 48 | AP-008 | declared in errors.ts |
| AppraisalAlreadyExists | 51 | AP-005 | another appraisal holds this employee and appraisal cycle; by the rule appraisal.oneAppraisalPerCycle |
| AppraisalNotDraft | 40 | AP-900 | the appraisal is in a state rate can't start from; carries `state` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its appraisal.company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## How to call

```sh
capxul appraisal rate --appraisal <appraisal> --scores <scores>
```

HTTP: `POST /appraisal/rate` with the payload as JSON. SDK: `Sdk.appraisal.rate(payload)`.
