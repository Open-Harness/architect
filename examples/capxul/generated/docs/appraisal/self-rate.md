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

## Worked examples

### appraise a year

Starts from the world `a second feedback criteria`.

- **Olga rates herself 1 and 0.8: a self score of 4.5, and a final score of 3.87.** `olga` (signed in) calls and sends appraisal the last call's appraisal, ratings [{ criteria: the world's criteria, rating: { value: `1`, scale: 0 } }, { criteria: the world's otherCriteria, rating: { value: `8`, scale: 1 } }], and gets back [`4.5`, `3.87`].

### rate an appraisal

Starts from the world `a manual cycle draft`.

- **Ada can't rate Olga for her.** `ada` (role company.owner) calls and sends appraisal the world's manualAppraisal, ratings [{ criteria: the world's criteria, rating: { value: `8`, scale: 1 } }, { criteria: the world's otherCriteria, rating: { value: `7`, scale: 1 } }], and is refused with NotAllowed, AR-001.
- **nor can Cy.** `cy` (signed in) calls and sends appraisal the world's manualAppraisal, ratings [{ criteria: the world's criteria, rating: { value: `8`, scale: 1 } }, { criteria: the world's otherCriteria, rating: { value: `7`, scale: 1 } }], and is refused with NotAllowed, AR-001.
- **ratings missing a criteria are refused, even out of range.** `olga` (signed in) calls and sends appraisal the world's manualAppraisal, ratings [{ criteria: the world's criteria, rating: { value: `2`, scale: 0 } }], and is refused with SelfRatingsDontMatchCriteria, AP-009.
- **and so are ratings naming a criteria twice.** `olga` (signed in) calls and sends appraisal the world's manualAppraisal, ratings [{ criteria: the world's criteria, rating: { value: `8`, scale: 1 } }, { criteria: the world's criteria, rating: { value: `7`, scale: 1 } }], and is refused with SelfRatingsDontMatchCriteria, AP-009.
- **and a criteria of Acme Logistics.** `olga` (signed in) calls and sends appraisal the world's manualAppraisal, ratings [{ criteria: the world's criteria, rating: { value: `8`, scale: 1 } }, { criteria: the world's outsideCriteria, rating: { value: `7`, scale: 1 } }], and is refused with SelfRatingsDontMatchCriteria, AP-009.
- **a rating over 1 is refused.** `olga` (signed in) calls and sends appraisal the world's manualAppraisal, ratings [{ criteria: the world's criteria, rating: { value: `101`, scale: 2 } }, { criteria: the world's otherCriteria, rating: { value: `7`, scale: 1 } }], and is refused with SelfRatingOutOfRange, AP-010.
- **and one below 0.** `olga` (signed in) calls and sends appraisal the world's manualAppraisal, ratings [{ criteria: the world's criteria, rating: { value: `8`, scale: 1 } }, { criteria: the world's otherCriteria, rating: { value: `-1`, scale: 2 } }], and is refused with SelfRatingOutOfRange, AP-010.
- **Olga rates herself 0.8 and 0.7: a self score of 3.85, and a final score of 2.48.** `olga` (signed in) calls and sends appraisal the world's manualAppraisal, ratings [{ criteria: the world's criteria, rating: { value: `8`, scale: 1 } }, { criteria: the world's otherCriteria, rating: { value: `7`, scale: 1 } }], and gets back [the world's manualAppraisal, `3.85`, `2.48`].
- **rating herself again, in the other order, 1 and 0, replaces it: a self score of 3.5.** `olga` (signed in) calls and sends appraisal the world's manualAppraisal, ratings [{ criteria: the world's otherCriteria, rating: { value: `0`, scale: 0 } }, { criteria: the world's criteria, rating: { value: `1`, scale: 0 } }], and gets back [`3.5`, `2.37`].
- **0.8 and 0.7 again.** `olga` (signed in) calls and sends appraisal the world's manualAppraisal, ratings [{ criteria: the world's criteria, rating: { value: `8`, scale: 1 } }, { criteria: the world's otherCriteria, rating: { value: `7`, scale: 1 } }], and gets back `3.85`.
- **nor rated by Olga.** `olga` (signed in) calls and sends appraisal the world's manualAppraisal, ratings [{ criteria: the world's criteria, rating: { value: `1`, scale: 0 } }, { criteria: the world's otherCriteria, rating: { value: `1`, scale: 0 } }], and is refused with AppraisalNotDraft, AP-900, carrying state `submitted`.
- **she may still rate herself on her open appraisal.** `cy` (signed in) calls and sends appraisal the world's secondManualAppraisal, ratings [{ criteria: the world's criteria, rating: { value: `1`, scale: 0 } }, { criteria: the world's otherCriteria, rating: { value: `1`, scale: 0 } }], and gets back [`5`, `1.67`].

## How to call

```sh
capxul appraisal self-rate --appraisal <appraisal> --ratings <ratings>
```

HTTP: `POST /appraisal/self-rate` with the payload as JSON. SDK: `Sdk.appraisal.self-rate(payload)`.
