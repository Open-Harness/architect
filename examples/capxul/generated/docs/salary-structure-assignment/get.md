<!-- Generated from the blueprint. Do not edit. -->
# salary-structure-assignment.get

Read one salary-structure-assignment by its id: company, employee, salaryStructure, fromDate, state.

**Who may call:** the owner of its company.

**A read:** answered from the records, with no handler.

**Budget:** p95 50ms.

## Payload

| field | value |
|---|---|
| id | salary-structure-assignment.id |

## Answer

| field | value | description |
|---|---|---|
| company | salary-structure-assignment.company |  |
| employee | salary-structure-assignment.employee |  |
| salaryStructure | salary-structure-assignment.salaryStructure |  |
| fromDate | salary-structure-assignment.fromDate | The first day the structure pays the employee. |
| state | text |  |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its company; the handler never runs |

## Worked examples

### assign salary structures

Starts from the world `a payroll outsider`.

- **Bo can't read it.** `bo` (signed in) calls and sends id the last call's salaryStructureAssignment, and is refused with NotAllowed, AR-001.
- **it reads back a draft.** `ada` (role company.owner) calls and sends id the last call's salaryStructureAssignment, and gets back [the world's company, the world's secondEmployee, the world's salaryStructure, `2026-01-12`, `draft`].
- **it reads back cancelled.** `ada` (role company.owner) calls and sends id the last call's salaryStructureAssignment, and gets back [the world's secondEmployee, `2026-01-12`, `cancelled`].
- **it reads back from 1 June.** `ada` (role company.owner) calls and sends id the last call's salaryStructureAssignment, and gets back [the world's employee, `2026-06-01`, `draft`].

## How to call

```sh
capxul salary-structure-assignment get --id <id>
```

HTTP: `POST /salary-structure-assignment/get` with the payload as JSON. SDK: `Sdk.salary-structure-assignment.get(payload)`.
