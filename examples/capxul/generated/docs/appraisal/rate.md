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
| NotRatedManually | 46 | AP-006 | declared in errors.ts |
| ScoresDontMatchKras | 47 | AP-007 | declared in errors.ts |
| KraScoreOutOfRange | 48 | AP-008 | declared in errors.ts |
| AppraisalAlreadyExists | 51 | AP-005 | another appraisal holds this employee and appraisal cycle; by the rule appraisal.oneAppraisalPerCycle |
| AppraisalNotDraft | 40 | AP-900 | the appraisal is in a state rate can't start from; carries `state` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its appraisal.company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### rate an appraisal

Starts from the world `a manual cycle draft`.

- **Olga can't rate her own KRAs.** `olga` (signed in) calls and sends appraisal the world's manualAppraisal, scores [{ kra: the world's kra, score: { value: `5`, scale: 0 } }, { kra: the world's otherKra, score: { value: `3`, scale: 0 } }], and is refused with NotAllowed, AR-001.
- **nor can Bo.** `bo` (signed in) calls and sends appraisal the world's manualAppraisal, scores [{ kra: the world's kra, score: { value: `5`, scale: 0 } }, { kra: the world's otherKra, score: { value: `3`, scale: 0 } }], and is refused with NotAllowed, AR-001.
- **an appraisal scored from goals isn't rated by hand, even with a score out of range.** `ada` (role company.owner) calls and sends appraisal the world's appraisal, scores [{ kra: the world's kra, score: { value: `6`, scale: 0 } }, { kra: the world's otherKra, score: { value: `3`, scale: 0 } }], and is refused with NotRatedManually, AP-006.
- **scores missing a KRA are refused, even out of range.** `ada` (role company.owner) calls and sends appraisal the world's manualAppraisal, scores [{ kra: the world's kra, score: { value: `6`, scale: 0 } }], and is refused with ScoresDontMatchKras, AP-007.
- **and so are scores naming a KRA twice.** `ada` (role company.owner) calls and sends appraisal the world's manualAppraisal, scores [{ kra: the world's kra, score: { value: `5`, scale: 0 } }, { kra: the world's kra, score: { value: `3`, scale: 0 } }], and is refused with ScoresDontMatchKras, AP-007.
- **and a KRA the appraisal doesn't have.** `ada` (role company.owner) calls and sends appraisal the world's manualAppraisal, scores [{ kra: the world's kra, score: { value: `5`, scale: 0 } }, { kra: the world's outsideKra, score: { value: `3`, scale: 0 } }], and is refused with ScoresDontMatchKras, AP-007.
- **and a score for each KRA with one more.** `ada` (role company.owner) calls and sends appraisal the world's manualAppraisal, scores [{ kra: the world's kra, score: { value: `5`, scale: 0 } }, { kra: the world's otherKra, score: { value: `3`, scale: 0 } }, { kra: the world's outsideKra, score: { value: `1`, scale: 0 } }], and is refused with ScoresDontMatchKras, AP-007.
- **a score over 5 is refused.** `ada` (role company.owner) calls and sends appraisal the world's manualAppraisal, scores [{ kra: the world's kra, score: { value: `501`, scale: 2 } }, { kra: the world's otherKra, score: { value: `3`, scale: 0 } }], and is refused with KraScoreOutOfRange, AP-008.
- **and one below 0.** `ada` (role company.owner) calls and sends appraisal the world's manualAppraisal, scores [{ kra: the world's kra, score: { value: `5`, scale: 0 } }, { kra: the world's otherKra, score: { value: `-1`, scale: 2 } }], and is refused with KraScoreOutOfRange, AP-008.
- **Ada scores Quality 5 and Development 3: a total of 3.6.** `ada` (role company.owner) calls and sends appraisal the world's manualAppraisal, scores [{ kra: the world's kra, score: { value: `5`, scale: 0 } }, { kra: the world's otherKra, score: { value: `3`, scale: 0 } }], and gets back [the world's manualAppraisal, `3.6`, `1.2`].
- **scores given in the other order land on their own KRAs.** `ada` (role company.owner) calls and sends appraisal the world's manualAppraisal, scores [{ kra: the world's otherKra, score: { value: `0`, scale: 0 } }, { kra: the world's kra, score: { value: `5`, scale: 0 } }], and gets back [`1.5`, `0.5`].
- **a rating replaces the one before: 4.25 earns 1.275 and 3.15 earns 2.205, a total of 3.48, summed before rounding as HRMS does.** `ada` (role company.owner) calls and sends appraisal the world's manualAppraisal, scores [{ kra: the world's kra, score: { value: `425`, scale: 2 } }, { kra: the world's otherKra, score: { value: `315`, scale: 2 } }], and gets back [`3.48`, `1.16`].
- **5 and 3 again.** `ada` (role company.owner) calls and sends appraisal the world's manualAppraisal, scores [{ kra: the world's kra, score: { value: `5`, scale: 0 } }, { kra: the world's otherKra, score: { value: `3`, scale: 0 } }], and gets back `3.6`.
- **nor rated.** `ada` (role company.owner) calls and sends appraisal the world's manualAppraisal, scores [{ kra: the world's kra, score: { value: `1`, scale: 0 } }, { kra: the world's otherKra, score: { value: `1`, scale: 0 } }], and is refused with AppraisalNotDraft, AP-900, carrying state `submitted`.
- **and Ada may rate it.** `ada` (role company.owner) calls and sends appraisal the world's secondManualAppraisal, scores [{ kra: the world's kra, score: { value: `0`, scale: 0 } }, { kra: the world's otherKra, score: { value: `5`, scale: 0 } }], and gets back [`3.5`, `2.83`].

## How to call

```sh
capxul appraisal rate --appraisal <appraisal> --scores <scores>
```

HTTP: `POST /appraisal/rate` with the payload as JSON. SDK: `Sdk.appraisal.rate(payload)`.
