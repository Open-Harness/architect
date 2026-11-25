<!-- Generated from the blueprint. Do not edit. -->
# employment-type

A way a company employs people, such as full-time or contract.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| company | company.id |
| employmentTypeName | Name |

## Machine

States: active. A move from the wrong state is refused EmploymentTypeNotActive (exit 40).

| move | from | to | emits |
|---|---|---|---|
| create | (creates) | active | EmploymentTypeCreated |

## Invariants

- `employment-type.oneNamePerCompany`: another employment type holds this company and employment type name. Unique on company, employmentTypeName, in every state; refused EmploymentTypeNameTaken.

## Events

- `EmploymentTypeCreated`: carries employmentType (employment-type.id), company (employment-type.company); emitted by the move create

## Operations

- [employment-type.create](create.md): Add a way a company employs people.
- [employment-type.get](get.md): Read one employment-type by its id: company, employmentTypeName, state.
