<!-- Generated from the blueprint. Do not edit. -->
# department

A part of a company that its employees work in.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| company | company.id |
| departmentName | Name |

## Machine

States: active. A move from the wrong state is refused DepartmentNotActive (exit 40).

| move | from | to | emits |
|---|---|---|---|
| create | (creates) | active | DepartmentCreated |

## Invariants

- `department.oneNamePerCompany`: another department holds this company and department name. Unique on company, departmentName, in every state; refused DepartmentNameTaken.

## Events

- `DepartmentCreated`: carries department (department.id), company (department.company); emitted by the move create

## Operations

- [department.create](create.md): Add a department to a company.
- [department.get](get.md): Read one department by its id: company, departmentName, state.
