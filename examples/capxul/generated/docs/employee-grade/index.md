<!-- Generated from the blueprint. Do not edit. -->
# employee-grade

A level a company places its employees at, such as junior or senior.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| company | company.id |
| gradeName | Name |

## Machine

States: active. A move from the wrong state is refused EmployeeGradeNotActive (exit 40).

| move | from | to | emits |
|---|---|---|---|
| create | (creates) | active | EmployeeGradeCreated |

## Invariants

- `employee-grade.oneNamePerCompany`: another employee grade holds this company and grade name. Unique on company, gradeName, in every state; refused EmployeeGradeNameTaken.

## Events

- `EmployeeGradeCreated`: carries grade (employee-grade.id), company (employee-grade.company); emitted by the move create

## Operations

- [employee-grade.create](create.md): Add a grade to a company.
- [employee-grade.get](get.md): Read one employee-grade by its id: company, gradeName, state.
