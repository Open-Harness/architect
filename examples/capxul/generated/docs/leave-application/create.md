<!-- Generated from the blueprint. Do not edit. -->
# leave-application.create

Ask for leave of one type, from one day to another, and why.

**Who may call:** the self of its employee, or the owner of its company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 300ms.

## Payload

| field | value |
|---|---|
| company | leave-application.company |
| employee | leave-application.employee |
| leaveType | leave-application.leaveType |
| fromDate | leave-application.fromDate |
| toDate | leave-application.toDate |
| reason | leave-application.reason |

## Answer

| field | value |
|---|---|
| leaveApplication | leave-application.id |
| totalLeaveDays | LeaveDays |

## Move

`create`: from nothing (it creates) to open, emitting LeaveApplied.

## Steps

- `leave-application.create.load` (database)
- `leave-application.create.insert` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| ApplicantNotInCompany | 41 | LP-001 | declared in errors.ts |
| ApplicantHasLeft | 42 | LP-002 | declared in errors.ts |
| ApplicationTypeNotInCompany | 43 | LP-003 | declared in errors.ts |
| LeaveEndsBeforeStart | 44 | LP-004 | declared in errors.ts, carrying fromDate |
| LeaveBeforeJoining | 45 | LP-005 | declared in errors.ts, carrying dateOfJoining |
| NoAllocationCovers | 46 | LP-006 | declared in errors.ts |
| LeaveAllHolidays | 47 | LP-007 | declared in errors.ts |
| InsufficientLeaveBalance | 48 | LP-008 | declared in errors.ts |
| LeaveOverlaps | 49 | LP-009 | declared in errors.ts |
| LeaveTooLong | 50 | LP-010 | declared in errors.ts, carrying maxContinuousDaysAllowed |
| LeaveDayAttended | 51 | LP-011 | declared in errors.ts, carrying attendanceDate |
| CompanyNotFound | 4 | CO-901 | nothing has the id in company; the handler never runs; carries `id` |
| EmployeeNotFound | 4 | EM-901 | nothing has the id in employee; the handler never runs; carries `id` |
| LeaveTypeNotFound | 4 | LT-901 | nothing has the id in leaveType; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the self of its employee, or the owner of its company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### attendance requests and leave

Starts from the world `a leave application`.

- **Olga asks for leave on Monday 15 March, and it stays open.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2027-03-15`, toDate `2027-03-15`, reason `Rest`, and gets back an answer matching `^lap_[0-9a-z]+$`.

### leave balance

Starts from the world `a leave allocation`.

- **Olga asks for Monday 1 to Friday 5 March 2027.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2027-03-01`, toDate `2027-03-05`, reason `Rest`, with the request key `first-week`, and gets back `5`.
- **Olga asks for 15 to 19 March, 5 days.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2027-03-15`, toDate `2027-03-19`, reason `Rest`, with the request key `third-week`, and is answered.
- **and for 22 to 26 March, 5 more: an open application takes nothing, so both fit.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2027-03-22`, toDate `2027-03-26`, reason `Rest`, with the request key `fourth-week`, and gets back `5`.
- **Olga sends the third week again under its request key.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2027-03-15`, toDate `2027-03-19`, reason `Rest`, with the request key `third-week`, and is answered.
- **Olga sends the fourth week again under its request key.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2027-03-22`, toDate `2027-03-26`, reason `Rest`, with the request key `fourth-week`, and is answered.
- **nor can Olga ask for Monday 5 April, one day.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2027-04-05`, toDate `2027-04-05`, reason `Rest`, with the request key `april-5`, and is refused with InsufficientLeaveBalance, LP-008.
- **Olga sends the third week again under its request key, again.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2027-03-15`, toDate `2027-03-19`, reason `Rest`, with the request key `third-week`, and is answered.
- **Olga sends the fourth week again under its request key, again.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2027-03-22`, toDate `2027-03-26`, reason `Rest`, with the request key `fourth-week`, and is answered.
- **Monday 5 April is still refused: all 10 are taken again.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2027-04-05`, toDate `2027-04-05`, reason `Rest`, with the request key `april-5-again`, and is refused with InsufficientLeaveBalance, LP-008.
- **Olga can't take 3 days of it, 5 to 7 April: her Annual Leave doesn't count toward it.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, leaveType the last call's leaveType, fromDate `2027-04-05`, toDate `2027-04-07`, reason `Rest`, with the request key `sick-three`, and is refused with InsufficientLeaveBalance, LP-008.
- **Olga takes 2, 5 and 6 April.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, leaveType the last call's leaveType, fromDate `2027-04-05`, toDate `2027-04-06`, reason `Rest`, with the request key `sick-two`, and gets back `2`.
- **half a day is left, so 7 April is refused.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, leaveType the last call's leaveType, fromDate `2027-04-07`, toDate `2027-04-07`, reason `Rest`, with the request key `sick-one`, and is refused with InsufficientLeaveBalance, LP-008.
- **Olga takes Monday 3 January 2028: 2027's days taken don't count.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2028-01-03`, toDate `2028-01-03`, reason `Rest`, with the request key `jan-2028`, and gets back `1`.
- **a leave from 31 December 2027 to 4 January 2028 is refused: no one allocation covers it.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2027-12-31`, toDate `2028-01-04`, reason `Rest`, with the request key `across-years`, and is refused with NoAllocationCovers, LP-006.
- **so is one in 2029, which nothing covers.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2029-01-08`, toDate `2029-01-08`, reason `Rest`, with the request key `in-2029`, and is refused with NoAllocationCovers, LP-006.
- **a leave in 2029 is still refused: a draft gives nothing.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2029-01-08`, toDate `2029-01-08`, reason `Rest`, with the request key `in-2029-again`, and is refused with NoAllocationCovers, LP-006.
- **Olga takes it from Monday 7 to Friday 11 June 2027, with no allocation of it.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, leaveType the last call's leaveType, fromDate `2027-06-07`, toDate `2027-06-11`, reason `Rest`, with the request key `unpaid-june`, and gets back `5`.
- **and Olga takes it in 2029 too, which no allocation covers.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, leaveType the last call's leaveType, fromDate `2029-02-05`, toDate `2029-02-06`, reason `Rest`, with the request key `unpaid-2029`, and gets back `2`.

### leave days

Starts from the world `a leave allocation`.

- **Olga asks for Monday 1 to Friday 5 March: four days, the holiday not counted.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2027-03-01`, toDate `2027-03-05`, reason `Rest`, with the request key `march`, and gets back `4`.
- **Olga sends her March leave again, and gets it back.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2027-03-01`, toDate `2027-03-05`, reason `Rest`, with the request key `march`, and is answered.
- **Olga can't take Friday 2 April alone: it takes no day.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2027-04-02`, toDate `2027-04-02`, reason `Rest`, with the request key `good-friday`, and is refused with LeaveAllHolidays, LP-007.
- **Thursday 8 to Tuesday 13 April takes four days: two of its six are holidays, so it isn't too long.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2027-04-08`, toDate `2027-04-13`, reason `Rest`, with the request key `april`, and gets back `4`.
- **Thursday 15 to Tuesday 20 April, six days with no holiday, is too long.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2027-04-15`, toDate `2027-04-20`, reason `Rest`, with the request key `too-long`, and is refused with LeaveTooLong, LP-010, carrying maxContinuousDaysAllowed `5`.
- **Olga takes Sick Leave on Good Friday: it counts the holiday.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, leaveType the last call's leaveType, fromDate `2027-04-02`, toDate `2027-04-02`, reason `Rest`, with the request key `sick-good-friday`, and gets back `1`.
- **Olga's Monday 14 to Wednesday 16 June takes two days: either list's holiday counts.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2027-06-14`, toDate `2027-06-16`, reason `Rest`, with the request key `june`, and gets back `2`.
- **Olga's Monday 3 May takes a day: Bo Ltd's holiday isn't Acme Trading's.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2027-05-03`, toDate `2027-05-03`, reason `Rest`, with the request key `may`, and gets back `1`.
- **a leave ending the day before it starts is refused.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2027-05-11`, toDate `2027-05-10`, reason `Rest`, with the request key `backwards`, and is refused with LeaveEndsBeforeStart, LP-004, carrying fromDate `2027-05-11`.
- **so is one ending the day before it starts, across a year's end.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2028-01-01`, toDate `2027-12-31`, reason `Rest`, with the request key `backwards-year`, and is refused with LeaveEndsBeforeStart, LP-004, carrying fromDate `2028-01-01`.
- **a leave from 2 to 6 January 2026, starting before Olga joined, is refused.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2026-01-02`, toDate `2026-01-06`, reason `Rest`, with the request key `before-joining`, and is refused with LeaveBeforeJoining, LP-005, carrying dateOfJoining `2026-01-05`.
- **so is one on the day before, alone.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2026-01-04`, toDate `2026-01-04`, reason `Rest`, with the request key `day-before`, and is refused with LeaveBeforeJoining, LP-005, carrying dateOfJoining `2026-01-05`.
- **one ending before it starts, before she joined, is refused for its dates first.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2026-01-04`, toDate `2026-01-03`, reason `Rest`, with the request key `both`, and is refused with LeaveEndsBeforeStart, LP-004, carrying fromDate `2026-01-04`.
- **Olga takes it on the day she joined, Monday 5 January 2026.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, leaveType the last call's leaveType, fromDate `2026-01-05`, toDate `2026-01-05`, reason `Rest`, with the request key `joining-day`, and gets back `1`.
- **Olga can't take 5 to 6 July: she was at work on the 5th.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2027-07-05`, toDate `2027-07-06`, reason `Rest`, with the request key `jul-5`, and is refused with LeaveDayAttended, LP-011, carrying attendanceDate `2027-07-05`.
- **Olga can't take Tuesday 6 to Thursday 8 July: the first day she was at work is the 6th.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2027-07-06`, toDate `2027-07-08`, reason `Rest`, with the request key `jul-6`, and is refused with LeaveDayAttended, LP-011, carrying attendanceDate `2027-07-06`.
- **Olga can take 12 to 14 July: absent and half days aren't days at work.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2027-07-12`, toDate `2027-07-14`, reason `Rest`, with the request key `jul-12`, and gets back `3`.
- **Olga sends 12 to 14 July again, and gets it back.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2027-07-12`, toDate `2027-07-14`, reason `Rest`, with the request key `jul-12`, and is answered.

### leave stays in its company

Starts from the world `a leave application`.

- **Olga can't ask for Bo's Annual Leave.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, leaveType the last call's leaveType, fromDate `2027-04-05`, toDate `2027-04-06`, reason `Rest`, and is refused with ApplicationTypeNotInCompany, LP-003.
- **even ending before it starts, which it is refused for after, again.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, leaveType the last call's leaveType, fromDate `2027-04-06`, toDate `2027-04-05`, reason `Rest`, and is refused with ApplicationTypeNotInCompany, LP-003.
- **Olga can't ask for leave in Bo Ltd, for her company first.** `olga` (signed in) calls and sends company the last call's company, employee the world's employee, leaveType the world's leaveType, fromDate `2027-04-05`, toDate `2027-04-06`, reason `Rest`, and is refused with ApplicantNotInCompany, LP-001.
- **Bo can't ask for Olga's leave in Acme Trading.** `bo` (signed in) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2027-04-05`, toDate `2027-04-06`, reason `Rest`, and is refused with NotAllowed, AR-001.
- **Olga can't ask for new leave.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2027-04-05`, toDate `2027-04-06`, reason `Rest`, and is refused with ApplicantHasLeft, LP-002.
- **nor can Ada for her, ending before it starts too.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2027-04-06`, toDate `2027-04-05`, reason `Rest`, and is refused with ApplicantHasLeft, LP-002.
- **nor ask for it there, for her company first.** `bo` (signed in) calls and sends company the last call's company, employee the world's employee, leaveType the world's leaveType, fromDate `2027-04-05`, toDate `2027-04-06`, reason `Rest`, and is refused with ApplicantNotInCompany, LP-001.

### overlapping leave

Starts from the world `a leave application`.

- **Olga can't ask for 3 to 4 March: it shares her open leave's last day.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2027-03-03`, toDate `2027-03-04`, reason `Rest`, with the request key `o1`, and is refused with LeaveOverlaps, LP-009.
- **nor for 26 February to 1 March, sharing its first.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2027-02-26`, toDate `2027-03-01`, reason `Rest`, with the request key `o2`, and is refused with LeaveOverlaps, LP-009.
- **nor for 2 March, inside it.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2027-03-02`, toDate `2027-03-02`, reason `Rest`, with the request key `o3`, and is refused with LeaveOverlaps, LP-009.
- **nor for 28 February to 5 March, around it, which is too long as well.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2027-02-28`, toDate `2027-03-05`, reason `Rest`, with the request key `o4`, and is refused with LeaveOverlaps, LP-009.
- **Olga can't ask for Sick Leave on 2 March either: any type overlaps.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, leaveType the last call's leaveType, fromDate `2027-03-02`, toDate `2027-03-02`, reason `Rest`, with the request key `o5`, and is refused with LeaveOverlaps, LP-009.
- **she asks for Thursday 4 and Friday 5 March: with her open leave, 5 days in a row.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2027-03-04`, toDate `2027-03-05`, reason `Rest`, with the request key `thu-fri`, and gets back `2`.
- **Saturday 6 March would make 6 in a row.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2027-03-06`, toDate `2027-03-06`, reason `Rest`, with the request key `r1`, and is refused with LeaveTooLong, LP-010, carrying maxContinuousDaysAllowed `5`.
- **so would Sunday 28 February, before them.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2027-02-28`, toDate `2027-02-28`, reason `Rest`, with the request key `r2`, and is refused with LeaveTooLong, LP-010, carrying maxContinuousDaysAllowed `5`.
- **Olga sends Thursday and Friday again under their request key.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2027-03-04`, toDate `2027-03-05`, reason `Rest`, with the request key `thu-fri`, and is answered.
- **Saturday 6 March is allowed now: the rejected days don't run on.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2027-03-06`, toDate `2027-03-06`, reason `Rest`, with the request key `sat`, and is answered.
- **and so is Thursday 4 March: the rejected leave doesn't overlap.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2027-03-04`, toDate `2027-03-04`, reason `Rest`, with the request key `thu`, and is answered.
- **Friday 5 March would join them, 1 to 6 March, 6 in a row.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2027-03-05`, toDate `2027-03-05`, reason `Rest`, with the request key `r3`, and is refused with LeaveTooLong, LP-010, carrying maxContinuousDaysAllowed `5`.
- **Sick Leave on Friday 5 March is allowed: Annual Leave either side doesn't run on into another type.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, leaveType the last call's leaveType, fromDate `2027-03-05`, toDate `2027-03-05`, reason `Rest`, with the request key `sick-fri`, and gets back `1`.
- **Sick Leave from Sunday 7 to Monday 8 March is allowed: Saturday's Annual Leave breaks the run.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, leaveType the last call's leaveType, fromDate `2027-03-07`, toDate `2027-03-08`, reason `Rest`, with the request key `sick-sun-mon`, and gets back `2`.
- **Sick Leave on Tuesday 9 March would run 3 days with them, over its 2.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, leaveType the last call's leaveType, fromDate `2027-03-09`, toDate `2027-03-09`, reason `Rest`, with the request key `r4`, and is refused with LeaveTooLong, LP-010, carrying maxContinuousDaysAllowed `2`.
- **Olga can't ask for 2 March, inside her approved leave.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2027-03-02`, toDate `2027-03-02`, reason `Rest`, with the request key `o6`, and is refused with LeaveOverlaps, LP-009.
- **2 March is allowed now.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2027-03-02`, toDate `2027-03-02`, reason `Rest`, with the request key `tue`, and gets back `1`.
- **Monday 15 to Friday 19 March, 5 days, is allowed.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2027-03-15`, toDate `2027-03-19`, reason `Rest`, with the request key `five`, and gets back `5`.
- **Monday 22 to Saturday 27 March, 6 days, isn't.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2027-03-22`, toDate `2027-03-27`, reason `Rest`, with the request key `r5`, and is refused with LeaveTooLong, LP-010, carrying maxContinuousDaysAllowed `5`.
- **Olga takes 40 days of it in a row, 1 June to 10 July 2027.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, leaveType the last call's leaveType, fromDate `2027-06-01`, toDate `2027-07-10`, reason `Rest`, with the request key `study`, and gets back `40`.
- **Bo asks for Tuesday 2 March himself: Olga's open leave that day isn't his.** `bo` (signed in) calls and sends company the world's company, employee the last call's employee, leaveType the world's leaveType, fromDate `2027-03-02`, toDate `2027-03-02`, reason `Rest`, and gets back `1`.

### take leave

Starts from the world `a leave allocation`.

- **Olga asks for Annual Leave from Monday 1 to Thursday 4 March 2027: four days.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2027-03-01`, toDate `2027-03-04`, reason `Family visit`, with the request key `first-leave`, and gets back [`4`, true].
- **Olga sends her leave again under its request key, and gets it back.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2027-03-01`, toDate `2027-03-04`, reason `Family visit`, with the request key `first-leave`, and gets back an answer matching `^lap_[0-9a-z]+$`.
- **Olga sends her leave again, and gets it back approved.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2027-03-01`, toDate `2027-03-04`, reason `Family visit`, with the request key `first-leave`, and gets back an answer matching `^lap_[0-9a-z]+$`.
- **Olga sends her leave a third time, and gets it back.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2027-03-01`, toDate `2027-03-04`, reason `Family visit`, with the request key `first-leave`, and gets back an answer matching `^lap_[0-9a-z]+$`.
- **Olga asks for Monday 8 March.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2027-03-08`, toDate `2027-03-08`, reason `Errands`, and gets back `1`.
- **Olga asks for Tuesday 9 March.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2027-03-09`, toDate `2027-03-09`, reason `Errands`, and is answered.
- **Olga asks for Wednesday 10 March.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2027-03-10`, toDate `2027-03-10`, reason `Errands`, and is answered.

## How to call

```sh
capxul leave-application create --company <company> --employee <employee> --leaveType <leaveType> --fromDate <fromDate> --toDate <toDate> --reason <reason>
```

HTTP: `POST /leave-application/create` with the payload as JSON. SDK: `Sdk.leave-application.create(payload)`.
