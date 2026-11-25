<!-- Generated from the blueprint. Do not edit. -->
# employee-separation

An employee's way out of the company, from their resignation to the end of their leaving.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| company | company.id |
| employee | employee.id |
| resignationLetterDate | Day |
| boardingBeginsOn | Day |

## Machine

States: pending, inProcess, completed. A move from the wrong state is refused EmployeeSeparationNotPending (exit 40).

| move | from | to | emits |
|---|---|---|---|
| create | (creates) | pending | EmployeeSeparationStarted |
| begin | pending | inProcess | EmployeeSeparationBegun |
| complete | pending, inProcess | completed | EmployeeSeparationCompleted |

## Invariants

- `employee-separation.oneOpenSeparationPerEmployee`: another pending or inProcess employee separation holds this employee. Unique on employee, while pending or inProcess; refused SeparationAlreadyOpen.

## Events

- `EmployeeSeparationBegun`: carries employeeSeparation (employee-separation.id); emitted by the move begin
- `EmployeeSeparationCompleted`: carries employeeSeparation (employee-separation.id); emitted by the move complete
- `EmployeeSeparationStarted`: carries employeeSeparation (employee-separation.id), employee (employee-separation.employee); emitted by the move create

## Operations

- [employee-separation.begin](begin.md): Mark a separation in process.
- [employee-separation.complete](complete.md): Mark a separation completed. The employee is relieved by its own call.
- [employee-separation.create](create.md): Start an employee's separation, from their resignation letter.
- [employee-separation.get](get.md): Read one employee-separation by its id: company, employee, resignationLetterDate, boardingBeginsOn, state.
