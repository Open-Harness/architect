<!-- Generated from the blueprint. Do not edit. -->
# appraisal-cycle.reopen

Put a completed cycle back in progress.

**Who may call:** the owner of its appraisalCycle.company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| appraisalCycle | appraisal-cycle.id |

## Answer

| field | value |
|---|---|
| appraisalCycle | appraisal-cycle.id |

## Move

`reopen`: from completed to inProgress, emitting AppraisalCycleReopened.

## Steps

- `appraisal-cycle.reopen.update` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| CycleNameTaken | 48 | CY-008 | another appraisal cycle holds this company and cycle name; by the rule appraisal-cycle.oneNamePerCompany, carrying cycleName |
| AppraisalCycleNotNotStarted | 40 | CY-900 | the appraisal-cycle is in a state reopen can't start from; carries `state` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its appraisalCycle.company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## How to call

```sh
capxul appraisal-cycle reopen --appraisalCycle <appraisalCycle>
```

HTTP: `POST /appraisal-cycle/reopen` with the payload as JSON. SDK: `Sdk.appraisal-cycle.reopen(payload)`.
