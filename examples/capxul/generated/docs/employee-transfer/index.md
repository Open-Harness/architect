<!-- Generated from the blueprint. Do not edit. -->
# employee-transfer

A change of an employee's department, from one day.

Lives in the database.

## Fields

| field | value | description |
|---|---|---|
| id | id |  |
| company | company.id |  |
| employee | employee.id |  |
| transferDate | Day |  |
| currentDepartment | department.id | The department the employee held when the transfer was drafted. |
| newDepartment | department.id | The department the employee holds once it is submitted. |

## Machine

States: draft, submitted, cancelled. A move from the wrong state is refused EmployeeTransferNotDraft (exit 40).

| move | from | to | emits |
|---|---|---|---|
| create | (creates) | draft | EmployeeTransferDrafted |
| submit | draft | submitted | EmployeeTransferred |
| cancel | submitted | cancelled | EmployeeTransferCancelled |

## Events

- `EmployeeTransferCancelled`: carries employeeTransfer (employee-transfer.id), employee (employee-transfer.employee), department (employee-transfer.currentDepartment: The department the employee held when the transfer was drafted.); emitted by the move cancel
- `EmployeeTransferDrafted`: carries employeeTransfer (employee-transfer.id), employee (employee-transfer.employee); emitted by the move create
- `EmployeeTransferred`: carries employeeTransfer (employee-transfer.id), employee (employee-transfer.employee), department (employee-transfer.newDepartment: The department the employee holds once it is submitted.); emitted by the move submit

## Operations

- [employee-transfer.cancel](cancel.md): Cancel a submitted transfer, putting back the department it replaced.
- [employee-transfer.create](create.md): Draft a transfer: an employee's new department, from a day.
- [employee-transfer.get](get.md): Read one employee-transfer by its id: company, employee, transferDate, currentDepartment, newDepartment, state.
- [employee-transfer.submit](submit.md): Submit a transfer on or after its day, giving the employee the new department.
