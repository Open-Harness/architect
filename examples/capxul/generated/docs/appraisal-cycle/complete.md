<!-- Generated from the blueprint. Do not edit. -->
# appraisal-cycle.complete

Mark a cycle completed once every appraisal in it is submitted.

**Who may call:** the owner of its appraisalCycle.company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 300ms.

## Payload

| field | value |
|---|---|
| appraisalCycle | appraisal-cycle.id |

## Answer

| field | value |
|---|---|
| appraisalCycle | appraisal-cycle.id |

## Move

`complete`: from inProgress to completed, emitting AppraisalCycleCompleted.

## Steps

- `appraisal-cycle.complete.load` (database)
- `appraisal-cycle.complete.update` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| AppraisalsNotSubmitted | 47 | CY-007 | declared in errors.ts, carrying drafts |
| CycleNameTaken | 48 | CY-008 | another appraisal cycle holds this company and cycle name; by the rule appraisal-cycle.oneNamePerCompany, carrying cycleName |
| AppraisalCycleNotNotStarted | 40 | CY-900 | the appraisal-cycle is in a state complete can't start from; carries `state` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its appraisalCycle.company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### run an appraisal cycle

Starts from the world `a three-person cycle`.

- **Ada can't complete it before it starts.** `ada` (role company.owner) calls and sends appraisalCycle the world's appraisalCycle, and is refused with AppraisalCycleNotNotStarted, CY-900, carrying state `notStarted`.
- **it can't complete while both appraisals are drafts.** `ada` (role company.owner) calls and sends appraisalCycle the world's appraisalCycle, and is refused with AppraisalsNotSubmitted, CY-007, carrying drafts `2`.
- **Bo can't complete it.** `bo` (signed in) calls and sends appraisalCycle the world's appraisalCycle, and is refused with NotAllowed, AR-001.
- **nor can Olga.** `olga` (signed in) calls and sends appraisalCycle the world's appraisalCycle, and is refused with NotAllowed, AR-001.
- **it still can't complete while Cy's is a draft.** `ada` (role company.owner) calls and sends appraisalCycle the world's appraisalCycle, and is refused with AppraisalsNotSubmitted, CY-007, carrying drafts `1`.
- **Ada completes the cycle.** `ada` (role company.owner) calls and sends appraisalCycle the world's appraisalCycle, and gets back the world's appraisalCycle.
- **it can't complete twice.** `ada` (role company.owner) calls and sends appraisalCycle the world's appraisalCycle, and is refused with AppraisalCycleNotNotStarted, CY-900, carrying state `completed`.

### set and track goals

Starts from the world `a started manual cycle`.

- **and completes H2 2026.** `ada` (role company.owner) calls and sends appraisalCycle the world's appraisalCycle, and gets back the world's appraisalCycle.

## How to call

```sh
capxul appraisal-cycle complete --appraisalCycle <appraisalCycle>
```

HTTP: `POST /appraisal-cycle/complete` with the payload as JSON. SDK: `Sdk.appraisal-cycle.complete(payload)`.
