<!-- Generated from the blueprint. Do not edit. -->
# leave-application

An employee's ask for leave of one type, from one day to another.

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
| reason | LeaveReason |
| totalLeaveDays | LeaveDays |

## Machine

States: open, approved, rejected, cancelled. A move from the wrong state is refused LeaveApplicationNotOpen (exit 40).

| move | from | to | emits |
|---|---|---|---|
| create | (creates) | open | LeaveApplied |
| approve | open | approved | LeaveApplicationApproved |
| reject | open | rejected | LeaveApplicationRejected |
| cancel | open, approved | cancelled | LeaveApplicationCancelled |

## Events

- `LeaveApplicationApproved`: carries leaveApplication (leave-application.id), marked (DayCount), changed (DayCount); emitted by the move approve
- `LeaveApplicationCancelled`: carries leaveApplication (leave-application.id); emitted by the move cancel
- `LeaveApplicationRejected`: carries leaveApplication (leave-application.id); emitted by the move reject
- `LeaveApplied`: carries leaveApplication (leave-application.id), company (leave-application.company), employee (leave-application.employee), leaveType (leave-application.leaveType); emitted by the move create

## Operations

- [leave-application.approve](approve.md): Approve a leave, marking each of its days On Leave.
- [leave-application.cancel](cancel.md): Cancel a leave, open or approved.
- [leave-application.create](create.md): Ask for leave of one type, from one day to another, and why.
- [leave-application.get](get.md): Read one leave-application by its id: company, employee, leaveType, fromDate, toDate, reason, totalLeaveDays, state.
- [leave-application.reject](reject.md): Reject a leave, marking none of its days.
