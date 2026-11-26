<!-- Generated from the blueprint. Do not edit. -->
# salary-structure-assignment.cancel

Cancel a submitted assignment, so payroll no longer counts it.

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
| salaryStructure | salary-structure-assignment.salaryStructure |

## Move

`cancel`: from submitted to cancelled, emitting SalaryStructureAssignmentCancelled.

## Steps

- `salary-structure-assignment.cancel.update` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| SalaryStructureAssignmentNotDraft | 40 | SA-900 | the salary-structure-assignment is in a state cancel can't start from; carries `state` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its salaryStructureAssignment.company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### assign salary structures

Starts from the world `a payroll outsider`.

- **a draft can't be cancelled.** `ada` (role company.owner) calls and sends salaryStructureAssignment the last call's salaryStructureAssignment, and is refused with SalaryStructureAssignmentNotDraft, SA-900, carrying state `draft`.
- **Bo can't cancel the second.** `bo` (signed in) calls and sends salaryStructureAssignment the last call's items 1 id, and is refused with NotAllowed, AR-001.
- **Ada cancels it.** `ada` (role company.owner) calls and sends salaryStructureAssignment the last call's items 1 id, and gets back the world's salaryStructure.
- **it can't be cancelled twice.** `ada` (role company.owner) calls and sends salaryStructureAssignment the last call's salaryStructureAssignment, and is refused with SalaryStructureAssignmentNotDraft, SA-900, carrying state `cancelled`.
- **then cancels it.** `ada` (role company.owner) calls and sends salaryStructureAssignment the last call's salaryStructureAssignment, and is answered.

### run a payroll

Starts from the world `an outside cost center`.

- **Ada cancels the seniors' one.** `ada` (role company.owner) calls and sends salaryStructureAssignment the last call's items 1 id, and is answered.

## How to call

```sh
capxul salary-structure-assignment cancel --salaryStructureAssignment <salaryStructureAssignment>
```

HTTP: `POST /salary-structure-assignment/cancel` with the payload as JSON. SDK: `Sdk.salary-structure-assignment.cancel(payload)`.
