<!-- Generated from the blueprint. Do not edit. -->
# leave-type

A kind of leave a company gives, such as annual leave.

Lives in the database.

## Fields

| field | value | description |
|---|---|---|
| id | id |  |
| company | company.id |  |
| leaveTypeName | LeaveTypeName |  |
| maxContinuousDaysAllowed | MaxContinuousDays |  |
| isLwp | YesNo | Leave without pay: never allocated, and taken with no balance. |
| includeHoliday | YesNo | Holidays inside a leave count as leave days. |

## Machine

States: active. A move from the wrong state is refused LeaveTypeNotActive (exit 40).

| move | from | to | emits |
|---|---|---|---|
| create | (creates) | active | LeaveTypeCreated |

## Invariants

- `leave-type.oneNamePerCompany`: another leave type holds this company and leave type name. Unique on company, leaveTypeName, in every state; refused LeaveTypeNameTaken.

## Events

- `LeaveTypeCreated`: carries leaveType (leave-type.id), company (leave-type.company); emitted by the move create

## Operations

- [leave-type.create](create.md): Add a kind of leave a company gives.
- [leave-type.get](get.md): Read one leave-type by its id: company, leaveTypeName, maxContinuousDaysAllowed, isLwp, includeHoliday, state.
