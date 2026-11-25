<!-- Generated from the blueprint. Do not edit. -->
# salary-structure-assignment.submit

Submit an assignment, so payroll pays the employee by its structure from its day on.

**Who may call:** the owner of its salaryStructureAssignment.company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| salaryStructureAssignment | salary-structure-assignment.id |

## Answer

| field | value |
|---|---|
| salaryStructureAssignment | salary-structure-assignment.id |
| employee | salary-structure-assignment.employee |
| salaryStructure | salary-structure-assignment.salaryStructure |

## Move

`submit`: from draft to submitted, emitting SalaryStructureAssignmentSubmitted.

## Steps

- `salary-structure-assignment.submit.load` (database)
- `salary-structure-assignment.submit.update` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| AssignmentExists | 43 | SA-003 | declared in errors.ts, carrying fromDate |
| AssignedStructureNotSubmitted | 46 | SA-006 | declared in errors.ts |
| SalaryStructureAssignmentNotDraft | 40 | SA-900 | the salary-structure-assignment is in a state submit can't start from; carries `state` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its salaryStructureAssignment.company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### assign salary structures

Starts from the world `a payroll outsider`.

- **nor submit it.** `bo` (signed in) calls and sends salaryStructureAssignment the last call's salaryStructureAssignment, and is refused with NotAllowed, AR-001.
- **Ada submits the second.** `ada` (role company.owner) calls and sends salaryStructureAssignment the last call's salaryStructureAssignment, and gets back [the world's secondEmployee, the world's salaryStructure].
- **it can't be submitted twice.** `ada` (role company.owner) calls and sends salaryStructureAssignment the last call's salaryStructureAssignment, and is refused with SalaryStructureAssignmentNotDraft, SA-900, carrying state `submitted`.
- **the first can't be submitted now: the day is taken, and the refusal names it.** `ada` (role company.owner) calls and sends salaryStructureAssignment the last call's items 0 id, and is refused with AssignmentExists, SA-003, carrying fromDate `2026-01-12`.
- **nor submitted again.** `ada` (role company.owner) calls and sends salaryStructureAssignment the last call's salaryStructureAssignment, and is refused with SalaryStructureAssignmentNotDraft, SA-900, carrying state `cancelled`.
- **a cancelled one doesn't hold the day: the first draft can be submitted now.** `ada` (role company.owner) calls and sends salaryStructureAssignment the last call's items 0 id, and is answered.
- **she submits Olga's.** `ada` (role company.owner) calls and sends salaryStructureAssignment the last call's salaryStructureAssignment, and gets back the world's employee.
- **Olga's day is her own: Cy's for the same day can be submitted.** `ada` (role company.owner) calls and sends salaryStructureAssignment the last call's items 2 id, and gets back the world's secondEmployee.
- **the draft can't be submitted now, its structure cancelled.** `ada` (role company.owner) calls and sends salaryStructureAssignment the last call's items 2 id, and is refused with AssignedStructureNotSubmitted, SA-006.
- **and submits it.** `ada` (role company.owner) calls and sends salaryStructureAssignment the last call's salaryStructureAssignment, and is answered.

### check every slip first

Starts from the world `a third paid employee`.

- **and submits it.** `ada` (role company.owner) calls and sends salaryStructureAssignment the last call's salaryStructureAssignment, and is answered.
- **and submits it.** `ada` (role company.owner) calls and sends salaryStructureAssignment the last call's salaryStructureAssignment, and is answered.

### pay a month

Starts from the world `a pension component`.

- **and submits it.** `ada` (role company.owner) calls and sends salaryStructureAssignment the last call's salaryStructureAssignment, and gets back the world's employee.
- **and submits that.** `ada` (role company.owner) calls and sends salaryStructureAssignment the last call's salaryStructureAssignment, and gets back the world's secondEmployee.

### run a payroll

Starts from the world `an outside cost center`.

- **and submits it.** `ada` (role company.owner) calls and sends salaryStructureAssignment the last call's salaryStructureAssignment, and is answered.
- **and submits it.** `ada` (role company.owner) calls and sends salaryStructureAssignment the last call's salaryStructureAssignment, and is answered.
- **and submits it.** `ada` (role company.owner) calls and sends salaryStructureAssignment the last call's salaryStructureAssignment, and is answered.
- **and submits it.** `ada` (role company.owner) calls and sends salaryStructureAssignment the last call's salaryStructureAssignment, and is answered.
- **and submits it.** `ada` (role company.owner) calls and sends salaryStructureAssignment the last call's salaryStructureAssignment, and is answered.
- **and submits it.** `ada` (role company.owner) calls and sends salaryStructureAssignment the last call's salaryStructureAssignment, and is answered.
- **and submits that.** `ada` (role company.owner) calls and sends salaryStructureAssignment the last call's salaryStructureAssignment, and is answered.
- **and submits it.** `ada` (role company.owner) calls and sends salaryStructureAssignment the last call's salaryStructureAssignment, and is answered.
- **and submits it.** `ada` (role company.owner) calls and sends salaryStructureAssignment the last call's salaryStructureAssignment, and is answered.
- **and submits it.** `ada` (role company.owner) calls and sends salaryStructureAssignment the last call's salaryStructureAssignment, and is answered.
- **and submits it.** `ada` (role company.owner) calls and sends salaryStructureAssignment the last call's salaryStructureAssignment, and is answered.
- **and submits it.** `ada` (role company.owner) calls and sends salaryStructureAssignment the last call's salaryStructureAssignment, and is answered.

## How to call

```sh
capxul salary-structure-assignment submit --salaryStructureAssignment <salaryStructureAssignment>
```

HTTP: `POST /salary-structure-assignment/submit` with the payload as JSON. SDK: `Sdk.salary-structure-assignment.submit(payload)`.
