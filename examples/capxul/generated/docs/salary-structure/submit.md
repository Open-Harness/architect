<!-- Generated from the blueprint. Do not edit. -->
# salary-structure.submit

Submit a salary structure, so it can be assigned.

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

`submit`: from draft to submitted, emitting SalaryStructureSubmitted.

## Steps

- `salary-structure.submit.update` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| StructureNetPayNegative | 46 | SS-006 | declared in errors.ts, carrying netPay |
| SalaryStructureNameTaken | 48 | SS-008 | another salary structure holds this company and salary structure name; by the rule salary-structure.oneNamePerCompany |
| SalaryStructureNotDraft | 40 | SS-900 | the salary-structure is in a state submit can't start from; carries `state` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its salaryStructure.company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### assign salary structures

Starts from the world `a payroll outsider`.

- **and submits it.** `ada` (role company.owner) calls and sends salaryStructure the last call's salaryStructure, and is answered.
- **and submits it.** `ada` (role company.owner) calls and sends salaryStructure the last call's salaryStructure, and is answered.
- **and submits it.** `ada` (role company.owner) calls and sends salaryStructure the last call's salaryStructure, and is answered.

### pay a month

Starts from the world `a pension component`.

- **Ada submits it.** `ada` (role company.owner) calls and sends salaryStructure the last call's items 0 salaryStructure, and is answered.

### run a payroll

Starts from the world `an outside cost center`.

- **and submits it.** `ada` (role company.owner) calls and sends salaryStructure the last call's salaryStructure, and is answered.
- **and submits it.** `ada` (role company.owner) calls and sends salaryStructure the last call's salaryStructure, and is answered.
- **and submits it.** `ada` (role company.owner) calls and sends salaryStructure the last call's salaryStructure, and is answered.
- **and submits it.** `ada` (role company.owner) calls and sends salaryStructure the last call's salaryStructure, and is answered.
- **and submits it.** `ada` (role company.owner) calls and sends salaryStructure the last call's salaryStructure, and is answered.
- **and submits it.** `ada` (role company.owner) calls and sends salaryStructure the last call's salaryStructure, and is answered.

### set up salary structures

Starts from the world `a pension component`.

- **nor submit it.** `bo` (signed in) calls and sends salaryStructure the last call's salaryStructure, and is refused with NotAllowed, AR-001.
- **Ada submits it.** `ada` (role company.owner) calls and sends salaryStructure the last call's salaryStructure, and gets back the last call's salaryStructure.
- **it can't be submitted twice.** `ada` (role company.owner) calls and sends salaryStructure the last call's items 0 salaryStructure, and is refused with SalaryStructureNotDraft, SS-900, carrying state `submitted`.
- **nor submitted again.** `ada` (role company.owner) calls and sends salaryStructure the last call's salaryStructure, and is refused with SalaryStructureNotDraft, SS-900, carrying state `cancelled`.
- **it can't be submitted, and carries the net pay.** `ada` (role company.owner) calls and sends salaryStructure the last call's salaryStructure, and is refused with StructureNetPayNegative, SS-006, carrying netPay `-50000000`.
- **it can be submitted.** `ada` (role company.owner) calls and sends salaryStructure the last call's salaryStructure, and is answered.

## How to call

```sh
capxul salary-structure submit --salaryStructure <salaryStructure>
```

HTTP: `POST /salary-structure/submit` with the payload as JSON. SDK: `Sdk.salary-structure.submit(payload)`.
