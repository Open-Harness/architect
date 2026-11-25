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

## Worked examples

### run an appraisal cycle

Starts from the world `a three-person cycle`.

- **Bo can't set up a cycle in Acme Trading.** `bo` (signed in) calls and sends company the world's company, cycleName `Bo's`, startDate `2027-01-01`, endDate `2027-06-30`, kraEvaluationMethod `Manual Rating`, appraisees [{ employee: the world's secondEmployee, appraisalTemplate: the world's appraisalTemplate }], and is refused with NotAllowed, AR-001.
- **nor can Olga.** `olga` (signed in) calls and sends company the world's company, cycleName `Olga's`, startDate `2027-01-01`, endDate `2027-06-30`, kraEvaluationMethod `Manual Rating`, appraisees [{ employee: the world's secondEmployee, appraisalTemplate: the world's appraisalTemplate }], and is refused with NotAllowed, AR-001.
- **a cycle ending the day before it starts is refused, carrying the start, though Bo is listed.** `ada` (role company.owner) calls and sends company the world's company, cycleName `Backwards`, startDate `2027-01-01`, endDate `2026-12-31`, kraEvaluationMethod `Manual Rating`, appraisees [{ employee: the world's outsider, appraisalTemplate: the world's appraisalTemplate }], and is refused with CycleEndsBeforeStart, CY-001, carrying startDate `2027-01-01`.
- **and one ending a month before it starts.** `ada` (role company.owner) calls and sends company the world's company, cycleName `Backwards`, startDate `2027-03-15`, endDate `2027-02-15`, kraEvaluationMethod `Manual Rating`, appraisees [{ employee: the world's employee, appraisalTemplate: the world's appraisalTemplate }], and is refused with CycleEndsBeforeStart, CY-001, carrying startDate `2027-03-15`.
- **an appraisee of Acme Logistics is refused, listed last, judged before a repeat.** `ada` (role company.owner) calls and sends company the world's company, cycleName `Outsider`, startDate `2027-01-01`, endDate `2027-06-30`, kraEvaluationMethod `Manual Rating`, appraisees [{ employee: the world's employee, appraisalTemplate: the world's appraisalTemplate }, { employee: the world's employee, appraisalTemplate: the world's appraisalTemplate }, { employee: the world's outsider, appraisalTemplate: the world's appraisalTemplate }], and is refused with AppraiseeNotInCompany, CY-002.
- **an employee listed twice is refused.** `ada` (role company.owner) calls and sends company the world's company, cycleName `Twice`, startDate `2027-01-01`, endDate `2027-06-30`, kraEvaluationMethod `Manual Rating`, appraisees [{ employee: the world's employee, appraisalTemplate: the world's appraisalTemplate }, { employee: the world's secondEmployee, appraisalTemplate: the world's appraisalTemplate }, { employee: the world's employee, appraisalTemplate: the world's appraisalTemplate }], and is refused with AppraiseeListedTwice, CY-005.
- **a one-day cycle with no appraisees may be set up.** `ada` (role company.owner) calls and sends company the world's company, cycleName `Empty`, startDate `2027-02-01`, endDate `2027-02-01`, kraEvaluationMethod `Manual Rating`, appraisees [], and gets back an answer matching `^apc_[0-9a-z]+$`.
- **a cycle's name is taken in Acme Trading.** `ada` (role company.owner) calls and sends company the world's company, cycleName `H2 2026`, startDate `2027-01-01`, endDate `2027-06-30`, kraEvaluationMethod `Manual Rating`, appraisees [{ employee: the world's employee, appraisalTemplate: the world's appraisalTemplate }], and is refused with CycleNameTaken, CY-008, carrying cycleName `H2 2026`.
- **Acme Logistics may use it for Bo.** `ada` (role company.owner) calls and sends company the world's otherCompany, cycleName `H2 2026`, startDate `2026-07-01`, endDate `2026-12-31`, kraEvaluationMethod `Manual Rating`, appraisees [], and gets back an answer matching `^apc_[0-9a-z]+$`.
- **a new cycle listing her is refused, judged before a repeat.** `ada` (role company.owner) calls and sends company the world's company, cycleName `Leaver`, startDate `2027-01-01`, endDate `2027-06-30`, kraEvaluationMethod `Manual Rating`, appraisees [{ employee: the world's employee, appraisalTemplate: the world's appraisalTemplate }, { employee: the world's employee, appraisalTemplate: the world's appraisalTemplate }, { employee: the world's newHire, appraisalTemplate: the world's appraisalTemplate }], and is refused with AppraiseeHasLeft, CY-003.
- **Bo of Acme Logistics is judged before Dee's leaving.** `ada` (role company.owner) calls and sends company the world's company, cycleName `Leaver`, startDate `2027-01-01`, endDate `2027-06-30`, kraEvaluationMethod `Manual Rating`, appraisees [{ employee: the world's newHire, appraisalTemplate: the world's appraisalTemplate }, { employee: the world's outsider, appraisalTemplate: the world's appraisalTemplate }], and is refused with AppraiseeNotInCompany, CY-002.
- **Dee's leaving is judged before Cy listed by Acme Logistics' template.** `ada` (role company.owner) calls and sends company the world's company, cycleName `Leaver`, startDate `2027-01-01`, endDate `2027-06-30`, kraEvaluationMethod `Manual Rating`, appraisees [{ employee: the world's secondEmployee, appraisalTemplate: the last call's appraisalTemplate }, { employee: the world's newHire, appraisalTemplate: the world's appraisalTemplate }], and is refused with AppraiseeHasLeft, CY-003.
- **a cycle by that template in Acme Trading is refused, listed last, judged before a repeat.** `ada` (role company.owner) calls and sends company the world's company, cycleName `Borrowed`, startDate `2027-01-01`, endDate `2027-06-30`, kraEvaluationMethod `Manual Rating`, appraisees [{ employee: the world's employee, appraisalTemplate: the world's appraisalTemplate }, { employee: the world's employee, appraisalTemplate: the world's appraisalTemplate }, { employee: the world's secondEmployee, appraisalTemplate: the last call's appraisalTemplate }], and is refused with AppraiseeTemplateNotInCompany, CY-004.

## How to call

```sh
capxul appraisal-cycle create --company <company> --cycleName <cycleName> --startDate <startDate> --endDate <endDate> --kraEvaluationMethod <kraEvaluationMethod> --appraisees <appraisees>
```

HTTP: `POST /appraisal-cycle/create` with the payload as JSON. SDK: `Sdk.appraisal-cycle.create(payload)`.
