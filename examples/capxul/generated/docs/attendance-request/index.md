<!-- Generated from the blueprint. Do not edit. -->
# attendance-request

An employee's ask to be marked at work on days the office didn't see them.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| company | company.id |
| employee | employee.id |
| fromDate | Day |
| toDate | Day |
| reason | AttendanceReason |

## Machine

States: draft, approved, rejected. A move from the wrong state is refused AttendanceRequestNotDraft (exit 40).

| move | from | to | emits |
|---|---|---|---|
| create | (creates) | draft | AttendanceRequested |
| approve | draft | approved | AttendanceRequestApproved |
| reject | draft | rejected | AttendanceRequestRejected |

## Events

- `AttendanceRequestApproved`: carries attendanceRequest (attendance-request.id), marked (DayCount), changed (DayCount); emitted by the move approve
- `AttendanceRequestRejected`: carries attendanceRequest (attendance-request.id); emitted by the move reject
- `AttendanceRequested`: carries attendanceRequest (attendance-request.id), company (attendance-request.company), employee (attendance-request.employee); emitted by the move create

## Operations

- [attendance-request.approve](approve.md): Approve a request, marking each of its days.
- [attendance-request.create](create.md): Ask for an employee to be marked at work, from one day to another, and why.
- [attendance-request.get](get.md): Read one attendance-request by its id: company, employee, fromDate, toDate, reason, state.
- [attendance-request.reject](reject.md): Reject a request, marking none of its days.
