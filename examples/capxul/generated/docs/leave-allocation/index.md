<!-- Generated from the blueprint. Do not edit. -->
# leave-allocation

The leave days an employee has of one type, between two days.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| company | company.id |
| employee | employee.id |
| leaveType | leave-type.id |
| fromDate | Day |
| toDate | Day |
| newLeavesAllocated | LeaveDays |

## Machine

States: draft, submitted. A move from the wrong state is refused LeaveAllocationNotDraft (exit 40).

| move | from | to | emits |
|---|---|---|---|
| create | (creates) | draft | LeaveAllocationCreated |
| submit | draft | submitted | LeaveAllocationSubmitted |

## Events

- `LeaveAllocationCreated`: carries leaveAllocation (leave-allocation.id), company (leave-allocation.company), employee (leave-allocation.employee), leaveType (leave-allocation.leaveType); emitted by the move create
- `LeaveAllocationSubmitted`: carries leaveAllocation (leave-allocation.id); emitted by the move submit

## Operations

- [leave-allocation.create](create.md): Give an employee leave days of one type, between two days, as a draft.
- [leave-allocation.get](get.md): Read one leave-allocation by its id: company, employee, leaveType, fromDate, toDate, newLeavesAllocated, state.
- [leave-allocation.submit](submit.md): Submit an allocation, so its leave days can be taken.
