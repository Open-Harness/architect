<!-- Generated from the blueprint. Do not edit. -->
# salary-structure.cancel

Cancel a submitted salary structure no assignment or salary slip uses.

**Who may call:** the owner of its salaryStructure.company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| salaryStructure | salary-structure.id |

## Answer

| field | value |
|---|---|
| salaryStructure | salary-structure.id |

## Move

`cancel`: from submitted to cancelled, emitting SalaryStructureCancelled.

## Steps

- `salary-structure.cancel.load` (database)
- `salary-structure.cancel.update` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| StructureInUse | 47 | SS-007 | declared in errors.ts |
| SalaryStructureNameTaken | 48 | SS-008 | another salary structure holds this company and salary structure name; by the rule salary-structure.oneNamePerCompany |
| SalaryStructureNotDraft | 40 | SS-900 | the salary-structure is in a state cancel can't start from; carries `state` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its salaryStructure.company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### assign salary structures

Starts from the world `a payroll outsider`.

- **a draft assignment doesn't keep the structure in use: Ada cancels it.** `ada` (role company.owner) calls and sends salaryStructure the last call's salaryStructure, and is answered.
- **a cancelled assignment doesn't keep the structure in use: Ada cancels it.** `ada` (role company.owner) calls and sends salaryStructure the last call's salaryStructure, and is answered.
- **the interim structure is used only by a draft, so Ada can cancel it.** `ada` (role company.owner) calls and sends salaryStructure the last call's items 4 salaryStructure, and is answered.

### pay a month

Starts from the world `a pension component`.

- **a structure an assignment uses can't be cancelled.** `ada` (role company.owner) calls and sends salaryStructure the last call's salaryStructure, and is refused with StructureInUse, SS-007.

### run a payroll

Starts from the world `an outside cost center`.

- **no submitted assignment uses that structure now, but its slips do: it can't be cancelled.** `ada` (role company.owner) calls and sends salaryStructure the last call's salaryStructure, and is refused with StructureInUse, SS-007.

### set up salary structures

Starts from the world `a pension component`.

- **a draft can't be cancelled.** `ada` (role company.owner) calls and sends salaryStructure the last call's salaryStructure, and is refused with SalaryStructureNotDraft, SS-900, carrying state `draft`.
- **Bo can't cancel it.** `bo` (signed in) calls and sends salaryStructure the last call's items 0 salaryStructure, and is refused with NotAllowed, AR-001.
- **nothing uses it, so Ada cancels it.** `ada` (role company.owner) calls and sends salaryStructure the last call's items 0 salaryStructure, and is answered.
- **it can't be cancelled twice.** `ada` (role company.owner) calls and sends salaryStructure the last call's salaryStructure, and is refused with SalaryStructureNotDraft, SS-900, carrying state `cancelled`.

## How to call

```sh
capxul salary-structure cancel --salaryStructure <salaryStructure>
```

HTTP: `POST /salary-structure/cancel` with the payload as JSON. SDK: `Sdk.salary-structure.cancel(payload)`.
