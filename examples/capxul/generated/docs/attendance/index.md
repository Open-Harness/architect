<!-- Generated from the blueprint. Do not edit. -->
# attendance

Whether an employee was at work on one day.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| company | company.id |
| employee | employee.id |
| attendanceDate | Day |
| status | AttendanceStatus |

## Machine

States: marked. A move from the wrong state is refused AttendanceNotMarked (exit 40).

| move | from | to | emits |
|---|---|---|---|
| mark | (creates) | marked | AttendanceMarked |

## Invariants

- `attendance.oneAttendancePerDay`: another attendance holds this employee and attendance date. Unique on employee, attendanceDate, in every state; refused AttendanceAlreadyMarked.

## Events

- `AttendanceMarked`: carries attendance (attendance.id), employee (attendance.employee), attendanceDate (attendance.attendanceDate), status (attendance.status); emitted by the move mark

## Operations

- [attendance.get](get.md): Read one attendance by its id: company, employee, attendanceDate, status, state.
- [attendance.list](list.md): List attendances, oldest first, 50 to a page, filtered by employee, attendanceDate.
- [attendance.mark](mark.md): Mark whether an employee was at work on a day.
