<!-- Generated from the blueprint. Do not edit. -->
# shift-type

A company's working shift, from the time it starts to the time it ends.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| company | company.id |
| shiftTypeName | Name |
| startTime | TimeOfDay |
| endTime | TimeOfDay |

## Machine

States: active. A move from the wrong state is refused ShiftTypeNotActive (exit 40).

| move | from | to | emits |
|---|---|---|---|
| create | (creates) | active | ShiftTypeCreated |

## Invariants

- `shift-type.oneNamePerCompany`: another shift type holds this company and shift type name. Unique on company, shiftTypeName, in every state; refused ShiftTypeNameTaken.

## Events

- `ShiftTypeCreated`: carries shiftType (shift-type.id), company (shift-type.company); emitted by the move create

## Operations

- [shift-type.create](create.md): Add a working shift to a company, from its start time to its end time.
- [shift-type.get](get.md): Read one shift-type by its id: company, shiftTypeName, startTime, endTime, state.
