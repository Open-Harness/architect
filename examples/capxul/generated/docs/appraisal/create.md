<!-- Generated from the blueprint. Do not edit. -->
# appraisal.create

Make an employee's appraisal in a cycle, by a template.

**Who may call:** the owner of its appraisalCycle.company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 300ms.

## Payload

| field | value |
|---|---|
| employee | appraisal.employee |
| appraisalCycle | appraisal.appraisalCycle |
| appraisalTemplate | appraisal.appraisalTemplate |

## Answer

| field | value |
|---|---|
| appraisal | appraisal.id |

## Move

`create`: from nothing (it creates) to draft, emitting AppraisalCreated.

## Steps

- `appraisal.create.load` (database)
- `appraisal.create.insert` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| AppraisedEmployeeNotInCompany | 41 | AP-001 | declared in errors.ts |
| AppraisedEmployeeHasLeft | 42 | AP-002 | declared in errors.ts |
| AppraisalCycleCompleted | 43 | AP-003 | declared in errors.ts |
| AppraisalTemplateNotInCompany | 44 | AP-004 | declared in errors.ts |
| AppraisalAlreadyExists | 51 | AP-005 | another appraisal holds this employee and appraisal cycle; by the rule appraisal.oneAppraisalPerCycle |
| EmployeeNotFound | 4 | EM-901 | nothing has the id in employee; the handler never runs; carries `id` |
| AppraisalTemplateNotFound | 4 | TP-901 | nothing has the id in appraisalTemplate; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its appraisalCycle.company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### run an appraisal cycle

Starts from the world `a three-person cycle`.

- **no appraisal is made in it now.** `ada` (role company.owner) calls and sends employee the world's newHire, appraisalCycle the world's appraisalCycle, appraisalTemplate the world's appraisalTemplate, and is refused with AppraisalCycleCompleted, AP-003.
- **and may then add Dee's appraisal by hand.** `ada` (role company.owner) calls and sends employee the world's newHire, appraisalCycle the world's appraisalCycle, appraisalTemplate the world's appraisalTemplate, and gets back an answer matching `^apr_[0-9a-z]+$`.
- **Ada makes Olga's Q1 2027 appraisal by hand before it starts.** `ada` (role company.owner) calls and sends employee the world's employee, appraisalCycle the world's threePersonCycle, appraisalTemplate the world's appraisalTemplate, and gets back an answer matching `^apr_[0-9a-z]+$`.

## How to call

```sh
capxul appraisal create --employee <employee> --appraisalCycle <appraisalCycle> --appraisalTemplate <appraisalTemplate>
```

HTTP: `POST /appraisal/create` with the payload as JSON. SDK: `Sdk.appraisal.create(payload)`.
