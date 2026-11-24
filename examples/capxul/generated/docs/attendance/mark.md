<!-- Generated from the blueprint. Do not edit. -->
# attendance.mark

Mark whether an employee was at work on a day.

**Who may call:** the owner of its company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| company | attendance.company |
| employee | attendance.employee |
| attendanceDate | attendance.attendanceDate |
| status | MarkedStatus |

## Answer

| field | value |
|---|---|
| attendance | attendance.id |

## Move

`mark`: from nothing (it creates) to marked, emitting AttendanceMarked.

## Steps

- `attendance.mark.load` (database)
- `attendance.mark.insert` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| AttendeeNotInCompany | 41 | AN-001 | declared in errors.ts |
| AttendeeHasLeft | 42 | AN-002 | declared in errors.ts |
| AttendanceBeforeJoining | 43 | AN-003 | declared in errors.ts, carrying dateOfJoining |
| AttendanceOnLeave | 45 | AN-005 | declared in errors.ts, carrying leaveApplication |
| AttendanceAlreadyMarked | 44 | AN-004 | another attendance holds this employee and attendance date; by the rule attendance.oneAttendancePerDay, carrying attendanceDate |
| EmployeeNotFound | 4 | EM-901 | nothing has the id in employee; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### approve an attendance request

Starts from the world `an attendance request`.

- **Ada marks Olga working from home on the Thursday already.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, attendanceDate `2026-11-26`, status `Work From Home`, and gets back an answer matching `^att_[0-9a-z]+$`.
- **and present on the Sunday before the request.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, attendanceDate `2026-11-22`, status `Present`, and gets back an answer matching `^att_[0-9a-z]+$`.
- **and present on the Wednesday, in the office.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, attendanceDate `2026-11-25`, status `Present`, and gets back an answer matching `^att_[0-9a-z]+$`.
- **and absent on the Saturday after it.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, attendanceDate `2026-11-28`, status `Absent`, and gets back an answer matching `^att_[0-9a-z]+$`.
- **and marks him present on Monday 23 November, a day Olga's request covers and she has no attendance for.** `ada` (role company.owner) calls and sends company the world's company, employee the last call's employee, attendanceDate `2026-11-23`, status `Present`, and gets back an answer matching `^att_[0-9a-z]+$`.
- **a day it marked can't be marked again.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, attendanceDate `2026-11-25`, status `Absent`, and is refused with AttendanceAlreadyMarked, AN-004, carrying attendanceDate `2026-11-25`.
- **Ada marks Olga absent on Monday 30 November.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, attendanceDate `2026-11-30`, status `Absent`, and gets back an answer matching `^att_[0-9a-z]+$`.
- **and present on Tuesday 1 December, in the office.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, attendanceDate `2026-12-01`, status `Present`, and gets back an answer matching `^att_[0-9a-z]+$`.
- **and a half day on Wednesday 2 December.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, attendanceDate `2026-12-02`, status `Half Day`, and gets back an answer matching `^att_[0-9a-z]+$`.
- **Ada marks Olga a half day on Saturday 5 December.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, attendanceDate `2026-12-05`, status `Half Day`, and gets back an answer matching `^att_[0-9a-z]+$`.
- **Ada marks Olga working from home on 29 February 2028.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, attendanceDate `2028-02-29`, status `Work From Home`, and gets back an answer matching `^att_[0-9a-z]+$`.

### attendance stays in its company

Starts from the world `an attendance request`.

- **Ada can't mark Olga in it: she works for Acme Trading, though Ada runs both.** `ada` (role company.owner) calls and sends company the last call's company, employee the world's employee, attendanceDate `2026-11-25`, status `Present`, and is refused with AttendeeNotInCompany, AN-001.
- **Bo can't mark Olga in his company: she works for Ada.** `bo` (signed in) calls and sends company the last call's company, employee the world's employee, attendanceDate `2026-11-25`, status `Present`, and is refused with AttendeeNotInCompany, AN-001.
- **nor mark her absent there.** `bo` (signed in) calls and sends company the last call's company, employee the world's employee, attendanceDate `2026-11-25`, status `Absent`, and is refused with AttendeeNotInCompany, AN-001.
- **nor mark her half day there.** `bo` (signed in) calls and sends company the last call's company, employee the world's employee, attendanceDate `2026-11-25`, status `Half Day`, and is refused with AttendeeNotInCompany, AN-001.
- **nor mark her work from home there.** `bo` (signed in) calls and sends company the last call's company, employee the world's employee, attendanceDate `2026-11-25`, status `Work From Home`, and is refused with AttendeeNotInCompany, AN-001.
- **Bo can't mark Olga in Ada's company.** `bo` (signed in) calls and sends company the world's company, employee the world's employee, attendanceDate `2026-11-25`, status `Present`, and is refused with NotAllowed, AR-001.
- **Bo can't mark Olga in it now she has left.** `bo` (signed in) calls and sends company the last call's company, employee the world's employee, attendanceDate `2025-12-01`, status `Present`, and is refused with AttendeeNotInCompany, AN-001.
- **Ada can't mark Olga now she has left, even on a day she was at work.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, attendanceDate `2026-11-25`, status `Present`, and is refused with AttendeeHasLeft, AN-002.
- **nor mark her absent now she has left.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, attendanceDate `2026-11-25`, status `Absent`, and is refused with AttendeeHasLeft, AN-002.
- **nor mark her half day now she has left.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, attendanceDate `2026-11-25`, status `Half Day`, and is refused with AttendeeHasLeft, AN-002.
- **nor mark her work from home now she has left.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, attendanceDate `2026-11-25`, status `Work From Home`, and is refused with AttendeeHasLeft, AN-002.
- **nor on a day before she joined.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, attendanceDate `2025-12-01`, status `Present`, and is refused with AttendeeHasLeft, AN-002.

### leave days

Starts from the world `a leave allocation`.

- **Ada can't mark Olga on the holiday inside it: the approved leave covers it.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, attendanceDate `2027-03-05`, status `Present`, and is refused with AttendanceOnLeave, AN-005, carrying leaveApplication the last call's leaveApplication.
- **Ada marks Olga present on Monday 5 July 2027.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, attendanceDate `2027-07-05`, status `Present`, and gets back an answer matching `^att_[0-9a-z]+$`.
- **Ada marks her working from home on Tuesday 6 July.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, attendanceDate `2027-07-06`, status `Work From Home`, and gets back an answer matching `^att_[0-9a-z]+$`.
- **Ada marks her present on Thursday 8 July.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, attendanceDate `2027-07-08`, status `Present`, and gets back an answer matching `^att_[0-9a-z]+$`.
- **Ada marks her absent on Monday 12 July.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, attendanceDate `2027-07-12`, status `Absent`, and gets back an answer matching `^att_[0-9a-z]+$`.
- **and on a half day on Tuesday 13 July.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, attendanceDate `2027-07-13`, status `Half Day`, and gets back an answer matching `^att_[0-9a-z]+$`.
- **Ada marks her present on Wednesday 14 July, while the leave is open.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, attendanceDate `2027-07-14`, status `Present`, and gets back an answer matching `^att_[0-9a-z]+$`.

### mark attendance

Starts from the world `an employee`.

- **Ada marks Olga present on Monday 2 November.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, attendanceDate `2026-11-02`, status `Present`, and gets back an answer matching `^att_[0-9a-z]+$`.
- **Ada marks her absent on the Tuesday.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, attendanceDate `2026-11-03`, status `Absent`, and is answered.
- **a half day on the Wednesday.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, attendanceDate `2026-11-04`, status `Half Day`, and is answered.
- **working from home on the Thursday.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, attendanceDate `2026-11-05`, status `Work From Home`, and is answered.
- **2 November can't be marked again, even with another status.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, attendanceDate `2026-11-02`, status `Absent`, and is refused with AttendanceAlreadyMarked, AN-004, carrying attendanceDate `2026-11-02`.
- **the day before Olga joined can't be marked.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, attendanceDate `2026-01-04`, status `Present`, and is refused with AttendanceBeforeJoining, AN-003, carrying dateOfJoining `2026-01-05`.
- **the day before she joined can't be marked absent either.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, attendanceDate `2026-01-04`, status `Absent`, and is refused with AttendanceBeforeJoining, AN-003, carrying dateOfJoining `2026-01-05`.
- **the day before she joined can't be marked half day either.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, attendanceDate `2026-01-04`, status `Half Day`, and is refused with AttendanceBeforeJoining, AN-003, carrying dateOfJoining `2026-01-05`.
- **the day before she joined can't be marked work from home either.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, attendanceDate `2026-01-04`, status `Work From Home`, and is refused with AttendanceBeforeJoining, AN-003, carrying dateOfJoining `2026-01-05`.
- **nor the last day of the year before.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, attendanceDate `2025-12-31`, status `Present`, and is refused with AttendanceBeforeJoining, AN-003, carrying dateOfJoining `2026-01-05`.
- **nor a day in the year before that falls later in its month.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, attendanceDate `2025-02-10`, status `Present`, and is refused with AttendanceBeforeJoining, AN-003, carrying dateOfJoining `2026-01-05`.
- **the day she joined can.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, attendanceDate `2026-01-05`, status `Present`, and is answered.
- **and so can a day still to come: HRMS has no check on it at 46b38904.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, attendanceDate `2027-03-01`, status `Absent`, and is answered.
- **Olga can't mark herself.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, attendanceDate `2026-11-06`, status `Present`, and is refused with NotAllowed, AR-001.
- **Bo can't mark her.** `bo` (signed in) calls and sends company the world's company, employee the world's employee, attendanceDate `2026-11-06`, status `Present`, and is refused with NotAllowed, AR-001.
- **Bo can't be marked on a day Olga had joined but he hadn't.** `ada` (role company.owner) calls and sends company the world's company, employee the last call's employee, attendanceDate `2026-01-20`, status `Present`, and is refused with AttendanceBeforeJoining, AN-003, carrying dateOfJoining `2026-02-01`.
- **Bo is marked on a day Olga was marked too: the rule is one a day for each employee.** `ada` (role company.owner) calls and sends company the world's company, employee the last call's employee, attendanceDate `2026-11-02`, status `Absent`, and gets back an answer matching `^att_[0-9a-z]+$`.

### reject an attendance request

Starts from the world `an attendance request`.

- **Ada marks Olga present on the Wednesday, in the office.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, attendanceDate `2026-11-25`, status `Present`, and gets back an answer matching `^att_[0-9a-z]+$`.
- **and working from home on the Thursday, as the request asks.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, attendanceDate `2026-11-26`, status `Work From Home`, and gets back an answer matching `^att_[0-9a-z]+$`.
- **so Ada may mark the Friday present.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, attendanceDate `2026-11-27`, status `Present`, and gets back an answer matching `^att_[0-9a-z]+$`.

### take leave

Starts from the world `a leave allocation`.

- **Ada marks Olga absent on Tuesday 2 March 2027.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, attendanceDate `2027-03-02`, status `Absent`, and gets back an answer matching `^att_[0-9a-z]+$`.
- **and present on Friday 26 February, the working day before.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, attendanceDate `2027-02-26`, status `Present`, and gets back an answer matching `^att_[0-9a-z]+$`.
- **Ada can't mark Olga present on Wednesday 3 March: she is on leave.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, attendanceDate `2027-03-03`, status `Present`, and is refused with AttendanceOnLeave, AN-005, carrying leaveApplication the last call's leaveApplication.
- **nor absent on the first day.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, attendanceDate `2027-03-01`, status `Absent`, and is refused with AttendanceOnLeave, AN-005, carrying leaveApplication the last call's leaveApplication.
- **nor on the last.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, attendanceDate `2027-03-04`, status `Work From Home`, and is refused with AttendanceOnLeave, AN-005, carrying leaveApplication the last call's leaveApplication.
- **she can mark Olga present on Friday 5 March, the day after.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, attendanceDate `2027-03-05`, status `Present`, and gets back an answer matching `^att_[0-9a-z]+$`.
- **Ada can still mark her that day while it is open.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, attendanceDate `2027-03-08`, status `Absent`, and gets back an answer matching `^att_[0-9a-z]+$`.
- **Ada can mark Olga present on that Tuesday.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, attendanceDate `2027-03-09`, status `Present`, and gets back an answer matching `^att_[0-9a-z]+$`.
- **Ada can mark Olga present on that Wednesday.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, attendanceDate `2027-03-10`, status `Present`, and gets back an answer matching `^att_[0-9a-z]+$`.

## How to call

```sh
capxul attendance mark --company <company> --employee <employee> --attendanceDate <attendanceDate> --status <status>
```

HTTP: `POST /attendance/mark` with the payload as JSON. SDK: `Sdk.attendance.mark(payload)`.
