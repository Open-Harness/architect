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
