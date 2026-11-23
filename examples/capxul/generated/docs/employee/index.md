<!-- Generated from the blueprint. Do not edit. -->
# employee

A person a company employs.

Lives in the database.

## Fields

| field | value | description |
|---|---|---|
| id | id |  |
| company | company.id |  |
| person | id | The person employed, who signs in as themselves. |
| firstName | Name |  |
| gender | Gender |  |
| dateOfBirth | Day |  |
| dateOfJoining | Day |  |
| department | department.id |  |
| designation | designation.id |  |

## Machine

States: active, left. A move from the wrong state is refused EmployeeNotActive (exit 40).

| move | from | to | emits |
|---|---|---|---|
| hire | (creates) | active | EmployeeHired |
| relieve | active | left | EmployeeRelieved |

## Invariants

- `employee.onePlacePerPerson`: another active employee holds this company and person. Unique on company, person, while active; refused EmployeeAlreadyHired.

## Events

- `EmployeeHired`: carries employee (employee.id), company (employee.company), person (employee.person: The person employed, who signs in as themselves.); emitted by the move hire
- `EmployeeRelieved`: carries employee (employee.id), relievingDate (Day); emitted by the move relieve

## Roles

- self

## Operations

- [employee.get](get.md): Read one employee by its id: company, person, firstName, gender, dateOfBirth, dateOfJoining, department, designation, state.
- [employee.hire](hire.md): Hire a person into a company, placed in one of its departments under one of its job titles.
- [employee.relieve](relieve.md): Record that an employee has left the company, on the day they were relieved.
