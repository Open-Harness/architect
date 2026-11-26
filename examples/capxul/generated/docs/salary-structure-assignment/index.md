<!-- Generated from the blueprint. Do not edit. -->
# salary-structure-assignment

An employee paid by a salary structure from a day on.

Lives in the database.

## Fields

| field | value | description |
|---|---|---|
| id | id |  |
| company | company.id |  |
| employee | employee.id |  |
| salaryStructure | salary-structure.id |  |
| fromDate | Day | The first day the structure pays the employee. |

## Machine

States: draft, submitted, cancelled. A move from the wrong state is refused SalaryStructureAssignmentNotDraft (exit 40).

| move | from | to | emits |
|---|---|---|---|
| create | (creates) | draft | SalaryStructureAssigned |
| submit | draft | submitted | SalaryStructureAssignmentSubmitted |
| cancel | submitted | cancelled | SalaryStructureAssignmentCancelled |

## Events

- `SalaryStructureAssigned`: carries salaryStructureAssignment (salary-structure-assignment.id), employee (salary-structure-assignment.employee), salaryStructure (salary-structure-assignment.salaryStructure), fromDate (salary-structure-assignment.fromDate: The first day the structure pays the employee.); emitted by the move create
- `SalaryStructureAssignmentCancelled`: carries salaryStructureAssignment (salary-structure-assignment.id); emitted by the move cancel
- `SalaryStructureAssignmentSubmitted`: carries salaryStructureAssignment (salary-structure-assignment.id); emitted by the move submit

## Operations

- [salary-structure-assignment.cancel](cancel.md): Cancel a submitted assignment, so payroll no longer counts it.
- [salary-structure-assignment.create](create.md): Assign a salary structure to an employee from a day on.
- [salary-structure-assignment.get](get.md): Read one salary-structure-assignment by its id: company, employee, salaryStructure, fromDate, state.
- [salary-structure-assignment.list](list.md): List salary-structure-assignments, oldest first, 50 to a page, filtered by employee.
- [salary-structure-assignment.submit](submit.md): Submit an assignment, so payroll pays the employee by its structure from its day on.
