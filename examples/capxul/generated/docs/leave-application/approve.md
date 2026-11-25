<!-- Generated from the blueprint. Do not edit. -->
# leave-application.approve

Approve a leave, marking each of its days On Leave.

**Who may call:** the owner of its leaveApplication.company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 400ms.

## Payload

| field | value |
|---|---|
| leaveApplication | leave-application.id |

## Answer

| field | value |
|---|---|
| leaveApplication | leave-application.id |
| marked | DayCount |
| changed | DayCount |

## Move

`approve`: from open to approved, emitting LeaveApplicationApproved.

## Steps

- `leave-application.approve.load` (database)
- `leave-application.approve.mark` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| InsufficientLeaveBalance | 48 | LP-008 | declared in errors.ts |
| LeaveDayAttended | 51 | LP-011 | declared in errors.ts, carrying attendanceDate |
| AttendanceAlreadyMarked | 44 | AN-004 | another attendance holds this employee and attendance date; by the rule attendance.oneAttendancePerDay, carrying attendanceDate |
| LeaveApplicationNotOpen | 40 | LP-900 | the leave-application is in a state approve can't start from; carries `state` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its leaveApplication.company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### attendance requests and leave

Starts from the world `a leave application`.

- **Ada approves her leave, 1 to 3 March.** `ada` (role company.owner) calls and sends leaveApplication the world's leaveApplication, and gets back [`3`, `0`].
- **Ada approves it, again.** `ada` (role company.owner) calls and sends leaveApplication the last call's leaveApplication, and gets back [`1`, `0`].

### leave balance

Starts from the world `a leave allocation`.

- **Ada approves it: 5 of her 10 days are taken.** `ada` (role company.owner) calls and sends leaveApplication the last call's leaveApplication, and is answered.
- **Ada approves it: all 10 days are taken.** `ada` (role company.owner) calls and sends leaveApplication the last call's leaveApplication, and is answered.
- **Ada can't approve it now: no day is left.** `ada` (role company.owner) calls and sends leaveApplication the last call's leaveApplication, and is refused with InsufficientLeaveBalance, LP-008.
- **Ada approves it now: the 5 days fit exactly.** `ada` (role company.owner) calls and sends leaveApplication the last call's leaveApplication, and is answered.
- **Ada approves them.** `ada` (role company.owner) calls and sends leaveApplication the last call's leaveApplication, and is answered.
- **and it is approved.** `ada` (role company.owner) calls and sends leaveApplication the last call's leaveApplication, and is answered.
- **and it is approved, again.** `ada` (role company.owner) calls and sends leaveApplication the last call's leaveApplication, and is answered.

### leave days

Starts from the world `a leave allocation`.

- **Ada approves it: the four days are marked, the holiday isn't.** `ada` (role company.owner) calls and sends leaveApplication the last call's leaveApplication, and gets back [`4`, `0`].
- **Ada approves it, and it marks Good Friday.** `ada` (role company.owner) calls and sends leaveApplication the last call's leaveApplication, and gets back [`1`, `0`].
- **Ada can't approve it now: Olga was at work on the 14th.** `ada` (role company.owner) calls and sends leaveApplication the last call's leaveApplication, and is refused with LeaveDayAttended, LP-011, carrying attendanceDate `2027-07-14`.

### leave stays in its company

Starts from the world `a leave application`.

- **Ada approves the leave Olga asked for before she left.** `ada` (role company.owner) calls and sends leaveApplication the world's leaveApplication, and gets back [the world's leaveApplication, `3`, `0`].

### overlapping leave

Starts from the world `a leave application`.

- **Ada approves 1 to 3 March.** `ada` (role company.owner) calls and sends leaveApplication the world's leaveApplication, and is answered.
- **Ada approves Olga's 5 days.** `ada` (role company.owner) calls and sends leaveApplication the last call's leaveApplication, and is answered.
- **and Ada approves them.** `ada` (role company.owner) calls and sends leaveApplication the last call's leaveApplication, and gets back [`5`, `0`].

### take leave

Starts from the world `a leave allocation`.

- **Olga can't approve her own leave.** `olga` (signed in) calls and sends leaveApplication the last call's leaveApplication, and is refused with NotAllowed, AR-001.
- **nor can Bo.** `bo` (signed in) calls and sends leaveApplication the last call's leaveApplication, and is refused with NotAllowed, AR-001.
- **Ada approves it: three days are new and the absent Tuesday changes.** `ada` (role company.owner) calls and sends leaveApplication the last call's leaveApplication, and gets back [the last call's leaveApplication, `3`, `1`].
- **it can't be approved twice.** `ada` (role company.owner) calls and sends leaveApplication the last call's leaveApplication, and is refused with LeaveApplicationNotOpen, LP-900, carrying state `approved`.
- **it can't be approved once rejected.** `ada` (role company.owner) calls and sends leaveApplication the last call's leaveApplication, and is refused with LeaveApplicationNotOpen, LP-900, carrying state `rejected`.
- **it can't be approved once cancelled.** `ada` (role company.owner) calls and sends leaveApplication the last call's leaveApplication, and is refused with LeaveApplicationNotOpen, LP-900, carrying state `cancelled`.
- **Ada approves it: the absent Monday changes to On Leave.** `ada` (role company.owner) calls and sends leaveApplication the last call's leaveApplication, and gets back [`0`, `1`].
- **Ada approves it: every day is On Leave already, so none is marked or changed.** `ada` (role company.owner) calls and sends leaveApplication the last call's leaveApplication, and gets back [`0`, `0`].

## How to call

```sh
capxul leave-application approve --leaveApplication <leaveApplication>
```

HTTP: `POST /leave-application/approve` with the payload as JSON. SDK: `Sdk.leave-application.approve(payload)`.
