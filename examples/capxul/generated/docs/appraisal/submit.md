<!-- Generated from the blueprint. Do not edit. -->
# appraisal.submit

Submit an appraisal.

**Who may call:** the owner of its appraisal.company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| appraisal | appraisal.id |

## Answer

| field | value | description |
|---|---|---|
| appraisal | appraisal.id |  |
| finalScore | appraisal.finalScore | The average of the three scores above (HRMS's `final_score`). |
| appraisalCycle | appraisal.appraisalCycle |  |

## Move

`submit`: from draft to submitted, emitting AppraisalSubmitted.

## Steps

- `appraisal.submit.load` (database)
- `appraisal.submit.update` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| AppraisalAlreadyExists | 51 | AP-005 | another appraisal holds this employee and appraisal cycle; by the rule appraisal.oneAppraisalPerCycle |
| AppraisalNotDraft | 40 | AP-900 | the appraisal is in a state submit can't start from; carries `state` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its appraisal.company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### appraise a year

Starts from the world `a second feedback criteria`.

- **Ada submits Olga's appraisal.** `ada` (role company.owner) calls and sends appraisal the last call's appraisal, and gets back `3.87`.
- **Ada submits Cy's.** `ada` (role company.owner) calls and sends appraisal the last call's items 1 id, and gets back `0`.

### give performance feedback

Starts from the world `a manual cycle draft`.

- **Ada submits Olga's H1 2027 appraisal.** `ada` (role company.owner) calls and sends appraisal the world's manualAppraisal, and gets back the world's manualCycle.
- **and Cy's.** `ada` (role company.owner) calls and sends appraisal the world's secondManualAppraisal, and gets back the world's manualCycle.

### rate an appraisal

Starts from the world `a manual cycle draft`.

- **Olga can't submit her own.** `olga` (signed in) calls and sends appraisal the world's manualAppraisal, and is refused with NotAllowed, AR-001.
- **nor can Bo.** `bo` (signed in) calls and sends appraisal the world's manualAppraisal, and is refused with NotAllowed, AR-001.
- **Ada submits Olga's, its final score 2.48.** `ada` (role company.owner) calls and sends appraisal the world's manualAppraisal, and gets back [the world's manualAppraisal, `2.48`, the world's manualCycle].
- **it can't be submitted twice.** `ada` (role company.owner) calls and sends appraisal the world's manualAppraisal, and is refused with AppraisalNotDraft, AP-900, carrying state `submitted`.
- **and submit it.** `ada` (role company.owner) calls and sends appraisal the world's secondManualAppraisal, and is answered.
- **Ada submits it.** `ada` (role company.owner) calls and sends appraisal the last call's items 0 id, and gets back the world's manualCycle.

### run an appraisal cycle

Starts from the world `a three-person cycle`.

- **Ada submits the first appraisal start answered.** `ada` (role company.owner) calls and sends appraisal the last call's appraisals 0, and gets back [the world's appraisalCycle, `0`].
- **and submits Cy's.** `ada` (role company.owner) calls and sends appraisal the last call's items 1 id, and gets back the world's appraisalCycle.

### set and track goals

Starts from the world `a started manual cycle`.

- **Ada submits Olga's H2 2026 appraisal.** `ada` (role company.owner) calls and sends appraisal the world's appraisal, and gets back `1.47`.
- **and Cy's.** `ada` (role company.owner) calls and sends appraisal the world's secondAppraisal, and gets back `0`.

## How to call

```sh
capxul appraisal submit --appraisal <appraisal>
```

HTTP: `POST /appraisal/submit` with the payload as JSON. SDK: `Sdk.appraisal.submit(payload)`.
