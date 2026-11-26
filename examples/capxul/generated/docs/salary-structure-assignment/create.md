<!-- Generated from the blueprint. Do not edit. -->
# salary-structure-assignment.create

Assign a salary structure to an employee from a day on.

**Who may call:** the owner of its company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

| field | value | description |
|---|---|---|
| company | salary-structure-assignment.company |  |
| employee | salary-structure-assignment.employee |  |
| salaryStructure | salary-structure-assignment.salaryStructure |  |
| fromDate | salary-structure-assignment.fromDate | The first day the structure pays the employee. |

## Answer

| field | value |
|---|---|
| salaryStructureAssignment | salary-structure-assignment.id |

## Move

`create`: from nothing (it creates) to draft, emitting SalaryStructureAssigned.

## Steps

- `salary-structure-assignment.create.load` (database)
- `salary-structure-assignment.create.insert` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| AssignedEmployeeNotInCompany | 41 | SA-001 | declared in errors.ts |
| AssignedEmployeeHasLeft | 42 | SA-002 | declared in errors.ts |
| AssignmentExists | 43 | SA-003 | declared in errors.ts, carrying fromDate |
| AssignmentBeforeJoining | 44 | SA-004 | declared in errors.ts, carrying dateOfJoining |
| AssignedStructureNotInCompany | 45 | SA-005 | declared in errors.ts |
| AssignedStructureNotSubmitted | 46 | SA-006 | declared in errors.ts |
| EmployeeNotFound | 4 | EM-901 | nothing has the id in employee; the handler never runs; carries `id` |
| SalaryStructureNotFound | 4 | SS-901 | nothing has the id in salaryStructure; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### assign salary structures

Starts from the world `a payroll outsider`.

- **Bo can't assign a structure at Acme Trading.** `bo` (signed in) calls and sends company the world's company, employee the world's secondEmployee, salaryStructure the world's salaryStructure, fromDate `2026-01-12`, and is refused with NotAllowed, AR-001.
- **Acme Logistics' driver can't be assigned Acme Trading's structure.** `ada` (role company.owner) calls and sends company the world's company, employee the world's outsider, salaryStructure the world's salaryStructure, fromDate `2026-03-02`, and is refused with AssignedEmployeeNotInCompany, SA-001.
- **Cy can't be paid from the day before she joined, and the refusal names her joining day.** `ada` (role company.owner) calls and sends company the world's company, employee the world's secondEmployee, salaryStructure the world's salaryStructure, fromDate `2026-01-11`, and is refused with AssignmentBeforeJoining, SA-004, carrying dateOfJoining `2026-01-12`.
- **Olga already has a submitted assignment from 5 January, so another that day is refused.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, salaryStructure the world's salaryStructure, fromDate `2026-01-05`, and is refused with AssignmentExists, SA-003, carrying fromDate `2026-01-05`.
- **a draft structure can't be assigned.** `ada` (role company.owner) calls and sends company the world's company, employee the world's secondEmployee, salaryStructure the last call's salaryStructure, fromDate `2026-01-12`, and is refused with AssignedStructureNotSubmitted, SA-006.
- **a day already taken is judged before the structure.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, salaryStructure the last call's salaryStructure, fromDate `2026-01-05`, and is refused with AssignmentExists, SA-003, carrying fromDate `2026-01-05`.
- **and the joining day before the structure.** `ada` (role company.owner) calls and sends company the world's company, employee the world's secondEmployee, salaryStructure the last call's salaryStructure, fromDate `2026-01-11`, and is refused with AssignmentBeforeJoining, SA-004, carrying dateOfJoining `2026-01-12`.
- **another company's employee is judged before the day.** `ada` (role company.owner) calls and sends company the world's company, employee the world's outsider, salaryStructure the last call's salaryStructure, fromDate `2026-01-01`, and is refused with AssignedEmployeeNotInCompany, SA-001.
- **Cy can't be paid by Acme Logistics' structure, though it is a draft too.** `ada` (role company.owner) calls and sends company the world's company, employee the world's secondEmployee, salaryStructure the last call's salaryStructure, fromDate `2026-01-12`, and is refused with AssignedStructureNotInCompany, SA-005.
- **the joining day is judged before the structure's company.** `ada` (role company.owner) calls and sends company the world's company, employee the world's secondEmployee, salaryStructure the last call's salaryStructure, fromDate `2026-01-11`, and is refused with AssignmentBeforeJoining, SA-004, carrying dateOfJoining `2026-01-12`.
- **Ada assigns the engineers' structure to Cy from her joining day.** `ada` (role company.owner) calls and sends company the world's company, employee the world's secondEmployee, salaryStructure the world's salaryStructure, fromDate `2026-01-12`, and is answered.
- **a second draft for the same day is allowed: drafts don't count.** `ada` (role company.owner) calls and sends company the world's company, employee the world's secondEmployee, salaryStructure the world's salaryStructure, fromDate `2026-01-12`, and is answered.
- **nor can a new one for that day be made.** `ada` (role company.owner) calls and sends company the world's company, employee the world's secondEmployee, salaryStructure the world's salaryStructure, fromDate `2026-01-12`, and is refused with AssignmentExists, SA-003, carrying fromDate `2026-01-12`.
- **Ada drafts Cy's assignment from 2 February.** `ada` (role company.owner) calls and sends company the world's company, employee the world's secondEmployee, salaryStructure the world's salaryStructure, fromDate `2026-02-02`, and is answered.
- **and Olga's from the same day.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, salaryStructure the world's salaryStructure, fromDate `2026-02-02`, and is answered.
- **she assigns it to Olga from 1 June, a draft.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, salaryStructure the last call's salaryStructure, fromDate `2026-06-01`, and is answered.
- **nor can a new one to that structure be made.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, salaryStructure the last call's items 2 salaryStructure, fromDate `2026-07-01`, and is refused with AssignedStructureNotSubmitted, SA-006.
- **a leaver can't be assigned a structure.** `ada` (role company.owner) calls and sends company the world's company, employee the world's secondEmployee, salaryStructure the world's salaryStructure, fromDate `2026-12-01`, and is refused with AssignedEmployeeHasLeft, SA-002.
- **having left is judged before a day already taken.** `ada` (role company.owner) calls and sends company the world's company, employee the world's secondEmployee, salaryStructure the world's salaryStructure, fromDate `2026-01-12`, and is refused with AssignedEmployeeHasLeft, SA-002.
- **another company's leaver is refused for the company first.** `ada` (role company.owner) calls and sends company the world's company, employee the world's outsider, salaryStructure the world's salaryStructure, fromDate `2026-12-01`, and is refused with AssignedEmployeeNotInCompany, SA-001.
- **she assigns it to Olga from 1 August.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, salaryStructure the last call's salaryStructure, fromDate `2026-08-01`, and is answered.
- **she drafts its assignment to Olga from 1 September.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, salaryStructure the last call's salaryStructure, fromDate `2026-09-01`, and is answered.
- **and drafts the engineers' structure for Olga on the same day: a draft holds no day.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, salaryStructure the world's salaryStructure, fromDate `2026-09-01`, and is answered.

### check every slip first

Starts from the world `a third paid employee`.

- **she assigns the structure to Eve from 1 February.** `ada` (role company.owner) calls and sends company the world's company, employee the world's thirdEmployee, salaryStructure the world's salaryStructure, fromDate `2026-02-01`, and is answered.
- **she assigns the structure to Cy from 10 February.** `ada` (role company.owner) calls and sends company the world's company, employee the world's secondEmployee, salaryStructure the world's salaryStructure, fromDate `2026-02-10`, and is answered.

### pay a month

Starts from the world `a pension component`.

- **she assigns it to Olga from her joining day.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, salaryStructure the last call's salaryStructure, fromDate `2026-01-05`, and is answered.
- **she assigns it to Cy from his.** `ada` (role company.owner) calls and sends company the world's company, employee the world's secondEmployee, salaryStructure the last call's salaryStructure, fromDate `2026-01-12`, and is answered.

### run a payroll

Starts from the world `an outside cost center`.

- **Ada drafts Cy's assignment from 1 February, and leaves it a draft.** `ada` (role company.owner) calls and sends company the world's company, employee the world's secondEmployee, salaryStructure the world's salaryStructure, fromDate `2026-02-01`, and is answered.
- **she assigns the engineers' structure to Cy from 16 March.** `ada` (role company.owner) calls and sends company the world's company, employee the world's secondEmployee, salaryStructure the world's salaryStructure, fromDate `2026-03-16`, and is answered.
- **Ada assigns it to Cy from 1 March too.** `ada` (role company.owner) calls and sends company the world's company, employee the world's secondEmployee, salaryStructure the world's salaryStructure, fromDate `2026-03-01`, and is answered.
- **she assigns it to Olga from 1 April.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, salaryStructure the last call's salaryStructure, fromDate `2026-04-01`, and is answered.
- **she assigns the engineers' structure to Dee from her joining day.** `ada` (role company.owner) calls and sends company the world's company, employee the last call's employee, salaryStructure the world's salaryStructure, fromDate `2026-04-08`, and is answered.
- **she assigns it to Olga from 1 July.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, salaryStructure the last call's salaryStructure, fromDate `2026-07-01`, and is answered.
- **she assigns that structure to Olga again, from 15 September.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, salaryStructure the last call's salaryStructure, fromDate `2026-09-15`, and is answered.
- **and again from 1 October.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, salaryStructure the last call's salaryStructure, fromDate `2026-10-01`, and is answered.
- **Ada assigns the engineers' structure to Olga from 20 September, made later but starting earlier.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, salaryStructure the world's salaryStructure, fromDate `2026-09-20`, and is answered.
- **and drafts another from 10 October, left a draft.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, salaryStructure the world's salaryStructure, fromDate `2026-10-10`, and is answered.
- **she assigns it to Olga from 1 November.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, salaryStructure the last call's salaryStructure, fromDate `2026-11-01`, and is answered.
- **she assigns it to Olga from 16 November.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, salaryStructure the last call's salaryStructure, fromDate `2026-11-16`, and is answered.
- **she assigns it to Olga from 1 December.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, salaryStructure the last call's salaryStructure, fromDate `2026-12-01`, and is answered.
- **she assigns it to Olga from 16 December.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, salaryStructure the last call's salaryStructure, fromDate `2026-12-16`, and is answered.

## How to call

```sh
capxul salary-structure-assignment create --company <company> --employee <employee> --salaryStructure <salaryStructure> --fromDate <fromDate>
```

HTTP: `POST /salary-structure-assignment/create` with the payload as JSON. SDK: `Sdk.salary-structure-assignment.create(payload)`.
