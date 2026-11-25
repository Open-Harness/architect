<!-- Generated from the blueprint. Do not edit. -->
# appraisal-cycle.start

Start a cycle, making an appraisal for each appraisee who has none yet.

**Who may call:** the owner of its appraisalCycle.company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 500ms.

## Payload

| field | value |
|---|---|
| appraisalCycle | appraisal-cycle.id |

## Answer

| field | value |
|---|---|
| appraisalCycle | appraisal-cycle.id |
| appraisals | AppraisalIds |

## Move

`start`: from notStarted to inProgress, emitting AppraisalCycleStarted.

## Steps

- `appraisal-cycle.start.load` (database)
- `appraisal-cycle.start.create` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| CycleWithoutAppraisees | 46 | CY-006 | declared in errors.ts |
| AppraisalAlreadyExists | 51 | AP-005 | another appraisal holds this employee and appraisal cycle; by the rule appraisal.oneAppraisalPerCycle |
| CycleNameTaken | 48 | CY-008 | another appraisal cycle holds this company and cycle name; by the rule appraisal-cycle.oneNamePerCompany, carrying cycleName |
| AppraisalCycleNotNotStarted | 40 | CY-900 | the appraisal-cycle is in a state start can't start from; carries `state` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its appraisalCycle.company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## How to call

```sh
capxul appraisal-cycle start --appraisalCycle <appraisalCycle>
```

HTTP: `POST /appraisal-cycle/start` with the payload as JSON. SDK: `Sdk.appraisal-cycle.start(payload)`.
