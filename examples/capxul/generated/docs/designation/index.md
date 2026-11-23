<!-- Generated from the blueprint. Do not edit. -->
# designation

A job title a company gives its employees.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| company | company.id |
| designationName | Name |

## Machine

States: active. A move from the wrong state is refused DesignationNotActive (exit 40).

| move | from | to | emits |
|---|---|---|---|
| create | (creates) | active | DesignationCreated |

## Invariants

- `designation.oneNamePerCompany`: another designation holds this company and designation name. Unique on company, designationName, in every state; refused DesignationNameTaken.

## Events

- `DesignationCreated`: carries designation (designation.id), company (designation.company); emitted by the move create

## Operations

- [designation.create](create.md): Add a job title to a company.
- [designation.get](get.md): Read one designation by its id: company, designationName, state.
