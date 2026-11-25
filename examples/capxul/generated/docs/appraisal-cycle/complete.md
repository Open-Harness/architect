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

## How to call

```sh
capxul appraisal-cycle complete --appraisalCycle <appraisalCycle>
```

HTTP: `POST /appraisal-cycle/complete` with the payload as JSON. SDK: `Sdk.appraisal-cycle.complete(payload)`.
