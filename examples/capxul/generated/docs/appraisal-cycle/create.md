<!-- Generated from the blueprint. Do not edit. -->
# appraisal-cycle.create

Set up an appraisal cycle: its days, how its KRAs are scored, and who is appraised by which template.

**Who may call:** the owner of its company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 300ms.

## Payload

| field | value |
|---|---|
| company | appraisal-cycle.company |
| cycleName | appraisal-cycle.cycleName |
| startDate | appraisal-cycle.startDate |
| endDate | appraisal-cycle.endDate |
| kraEvaluationMethod | appraisal-cycle.kraEvaluationMethod |
| appraisees | appraisal-cycle.appraisees |

## Answer

| field | value |
|---|---|
| appraisalCycle | appraisal-cycle.id |

## Move

`create`: from nothing (it creates) to notStarted, emitting AppraisalCycleCreated.

## Steps

- `appraisal-cycle.create.load` (database)
- `appraisal-cycle.create.insert` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| CycleEndsBeforeStart | 41 | CY-001 | declared in errors.ts, carrying startDate |
| AppraiseeNotInCompany | 42 | CY-002 | declared in errors.ts |
| AppraiseeHasLeft | 43 | CY-003 | declared in errors.ts |
| AppraiseeTemplateNotInCompany | 44 | CY-004 | declared in errors.ts |
| AppraiseeListedTwice | 45 | CY-005 | declared in errors.ts |
| CycleNameTaken | 48 | CY-008 | another appraisal cycle holds this company and cycle name; by the rule appraisal-cycle.oneNamePerCompany, carrying cycleName |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## How to call

```sh
capxul appraisal-cycle create --company <company> --cycleName <cycleName> --startDate <startDate> --endDate <endDate> --kraEvaluationMethod <kraEvaluationMethod> --appraisees <appraisees>
```

HTTP: `POST /appraisal-cycle/create` with the payload as JSON. SDK: `Sdk.appraisal-cycle.create(payload)`.
