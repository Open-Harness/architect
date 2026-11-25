<!-- Generated from the blueprint. Do not edit. -->
# attendance-request.create

Ask for an employee to be marked at work, from one day to another, and why.

**Who may call:** the self of its employee, or the owner of its company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| company | attendance-request.company |
| employee | attendance-request.employee |
| fromDate | attendance-request.fromDate |
| toDate | attendance-request.toDate |
| reason | attendance-request.reason |

## Answer

| field | value |
|---|---|
| attendanceRequest | attendance-request.id |

## Move

`create`: from nothing (it creates) to draft, emitting AttendanceRequested.

## Steps

- `attendance-request.create.load` (database)
- `attendance-request.create.insert` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| RequesterNotInCompany | 41 | AQ-001 | declared in errors.ts |
| RequesterHasLeft | 42 | AQ-002 | declared in errors.ts |
| RequestEndsBeforeStart | 43 | AQ-003 | declared in errors.ts, carrying fromDate |
| RequestBeforeJoining | 44 | AQ-004 | declared in errors.ts, carrying dateOfJoining |
| AttendanceRequestOverlaps | 45 | AQ-005 | declared in errors.ts |
| CompanyNotFound | 4 | CO-901 | nothing has the id in company; the handler never runs; carries `id` |
| EmployeeNotFound | 4 | EM-901 | nothing has the id in employee; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the self of its employee, or the owner of its company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### approve an attendance request

Starts from the world `an attendance request`.

- **Olga asks to be on duty from 30 November to 2 December, across the month's end.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, fromDate `2026-11-30`, toDate `2026-12-02`, reason `On Duty`, and gets back an answer matching `^arq_[0-9a-z]+$`.
- **Olga asks to work from home from Friday 4 to Sunday 6 December, across a weekend.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, fromDate `2026-12-04`, toDate `2026-12-06`, reason `Work From Home`, and gets back an answer matching `^arq_[0-9a-z]+$`.
- **Olga asks to work from home on 7 December alone.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, fromDate `2026-12-07`, toDate `2026-12-07`, reason `Work From Home`, and gets back an answer matching `^arq_[0-9a-z]+$`.
- **Olga asks to work from home on New Year's Eve and New Year's Day.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, fromDate `2026-12-31`, toDate `2027-01-01`, reason `Work From Home`, and gets back an answer matching `^arq_[0-9a-z]+$`.
- **Olga asks to work from home from 27 February to 1 March 2027, a year with no leap day.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, fromDate `2027-02-27`, toDate `2027-03-01`, reason `Work From Home`, and gets back an answer matching `^arq_[0-9a-z]+$`.
- **Olga asks to be on duty from 28 February to 1 March 2028, a leap year.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, fromDate `2028-02-28`, toDate `2028-03-01`, reason `On Duty`, and gets back an answer matching `^arq_[0-9a-z]+$`.
- **Olga asks to work from home for forty days, 1 April to 10 May 2027.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, fromDate `2027-04-01`, toDate `2027-05-10`, reason `Work From Home`, and gets back an answer matching `^arq_[0-9a-z]+$`.
- **Olga asks to be on duty from Friday 11 to Sunday 13 December, across a weekend.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, fromDate `2026-12-11`, toDate `2026-12-13`, reason `On Duty`, and gets back an answer matching `^arq_[0-9a-z]+$`.

### attendance requests and leave

Starts from the world `a leave application`.

- **Olga asks to work from home Monday 8 to Wednesday 10 March.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, fromDate `2027-03-08`, toDate `2027-03-10`, reason `Work From Home`, with the request key `a`, and is answered.
- **she can't ask for 10 to 11 March too: it shares the 10th.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, fromDate `2027-03-10`, toDate `2027-03-11`, reason `Work From Home`, with the request key `b`, and is refused with AttendanceRequestOverlaps, AQ-005.
- **nor for 5 to 8 March, sharing the 8th.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, fromDate `2027-03-05`, toDate `2027-03-08`, reason `Work From Home`, with the request key `c`, and is refused with AttendanceRequestOverlaps, AQ-005.
- **nor On Duty on the 9th, inside it.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, fromDate `2027-03-09`, toDate `2027-03-09`, reason `On Duty`, with the request key `d`, and is refused with AttendanceRequestOverlaps, AQ-005.
- **nor 1 to 31 March, around it.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, fromDate `2027-03-01`, toDate `2027-03-31`, reason `Work From Home`, with the request key `e`, and is refused with AttendanceRequestOverlaps, AQ-005.
- **11 to 12 March is allowed, from the day after.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, fromDate `2027-03-11`, toDate `2027-03-12`, reason `Work From Home`, with the request key `f`, and is answered.
- **12 March alone is allowed now: a rejected request doesn't overlap.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, fromDate `2027-03-12`, toDate `2027-03-12`, reason `On Duty`, with the request key `g`, and is answered.
- **Olga sends 8 to 10 March again, and gets it back.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, fromDate `2027-03-08`, toDate `2027-03-10`, reason `Work From Home`, with the request key `a`, and is answered.
- **Olga can't ask for the 9th again: an approved request overlaps.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, fromDate `2027-03-09`, toDate `2027-03-09`, reason `Work From Home`, with the request key `h`, and is refused with AttendanceRequestOverlaps, AQ-005.
- **Bo asks to work from home on the 9th: Olga's request isn't his.** `bo` (signed in) calls and sends company the world's company, employee the last call's employee, fromDate `2027-03-09`, toDate `2027-03-09`, reason `Work From Home`, and is answered.
- **Olga asks to work from home Friday 26 February to Thursday 4 March, around her open leave.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, fromDate `2027-02-26`, toDate `2027-03-04`, reason `Work From Home`, with the request key `around`, and is answered.
- **Olga sends the request around it again, and gets it back.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, fromDate `2027-02-26`, toDate `2027-03-04`, reason `Work From Home`, with the request key `around`, and is answered.
- **she asks to work from home on the 15th.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, fromDate `2027-03-15`, toDate `2027-03-15`, reason `Work From Home`, with the request key `open-leave`, and is answered.
- **Bo asks to work from home 1 to 3 March.** `bo` (signed in) calls and sends company the world's company, employee the last call's employee, fromDate `2027-03-01`, toDate `2027-03-03`, reason `Work From Home`, and is answered.
- **Olga asks to work from home on the 22nd.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, fromDate `2027-03-22`, toDate `2027-03-22`, reason `Work From Home`, with the request key `cancelled-leave`, and is answered.

### attendance stays in its company

Starts from the world `an attendance request`.

- **nor ask for Olga's attendance there.** `ada` (role company.owner) calls and sends company the last call's company, employee the world's employee, fromDate `2026-11-30`, toDate `2026-11-30`, reason `On Duty`, and is refused with RequesterNotInCompany, AQ-001.
- **nor can Olga ask for herself there.** `olga` (signed in) calls and sends company the last call's company, employee the world's employee, fromDate `2026-11-30`, toDate `2026-11-30`, reason `Work From Home`, and is refused with RequesterNotInCompany, AQ-001.
- **nor ask for her attendance there.** `bo` (signed in) calls and sends company the last call's company, employee the world's employee, fromDate `2026-11-30`, toDate `2026-11-30`, reason `On Duty`, and is refused with RequesterNotInCompany, AQ-001.
- **Olga can't ask to work from home in Bo's company either.** `olga` (signed in) calls and sends company the last call's company, employee the world's employee, fromDate `2026-11-30`, toDate `2026-11-30`, reason `Work From Home`, and is refused with RequesterNotInCompany, AQ-001.
- **nor ask for her there, ending before it starts.** `bo` (signed in) calls and sends company the last call's company, employee the world's employee, fromDate `2025-12-02`, toDate `2025-12-01`, reason `On Duty`, and is refused with RequesterNotInCompany, AQ-001.
- **Ada can't ask for Olga's attendance now she has left.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, fromDate `2026-11-30`, toDate `2026-11-30`, reason `On Duty`, and is refused with RequesterHasLeft, AQ-002.
- **nor for days that end before they start, before she joined.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, fromDate `2025-12-02`, toDate `2025-12-01`, reason `On Duty`, and is refused with RequesterHasLeft, AQ-002.
- **Olga can't ask for herself either.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, fromDate `2026-11-30`, toDate `2026-11-30`, reason `Work From Home`, and is refused with RequesterHasLeft, AQ-002.

### request attendance

Starts from the world `an employee`.

- **Olga asks to be marked working from home, 2 to 4 November.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, fromDate `2026-11-02`, toDate `2026-11-04`, reason `Work From Home`, and gets back an answer matching `^arq_[0-9a-z]+$`.
- **Ada asks for Olga on duty for the single day of 9 November.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, fromDate `2026-11-09`, toDate `2026-11-09`, reason `On Duty`, and is answered.
- **a request can't end the day before it starts.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, fromDate `2026-11-10`, toDate `2026-11-09`, reason `On Duty`, and is refused with RequestEndsBeforeStart, AQ-003, carrying fromDate `2026-11-10`.
- **nor in the month before.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, fromDate `2026-12-01`, toDate `2026-11-30`, reason `On Duty`, and is refused with RequestEndsBeforeStart, AQ-003, carrying fromDate `2026-12-01`.
- **nor in the year before, later in its month.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, fromDate `2027-01-01`, toDate `2026-12-31`, reason `Work From Home`, and is refused with RequestEndsBeforeStart, AQ-003, carrying fromDate `2027-01-01`.
- **a request can't start the day before Olga joined.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, fromDate `2026-01-04`, toDate `2026-01-06`, reason `On Duty`, and is refused with RequestBeforeJoining, AQ-004, carrying dateOfJoining `2026-01-05`.
- **nor to work from home from the day before she joined.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, fromDate `2026-01-04`, toDate `2026-01-06`, reason `Work From Home`, and is refused with RequestBeforeJoining, AQ-004, carrying dateOfJoining `2026-01-05`.
- **nor a year before, later in its year.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, fromDate `2025-03-01`, toDate `2026-01-06`, reason `On Duty`, and is refused with RequestBeforeJoining, AQ-004, carrying dateOfJoining `2026-01-05`.
- **one that ends before it starts and starts before she joined is refused for its order first.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, fromDate `2026-01-04`, toDate `2026-01-03`, reason `On Duty`, and is refused with RequestEndsBeforeStart, AQ-003, carrying fromDate `2026-01-04`.
- **the day she joined may start one.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, fromDate `2026-01-05`, toDate `2026-01-06`, reason `On Duty`, and gets back an answer matching `^arq_[0-9a-z]+$`.
- **days still to come may be asked for: HRMS's validate_dates runs with restrict_future_dates off.** `olga` (signed in) calls and sends company the world's company, employee the world's employee, fromDate `2027-06-01`, toDate `2027-06-02`, reason `Work From Home`, and gets back an answer matching `^arq_[0-9a-z]+$`.
- **Bo can't ask for Olga in Ada's company.** `bo` (signed in) calls and sends company the world's company, employee the world's employee, fromDate `2026-11-16`, toDate `2026-11-17`, reason `On Duty`, and is refused with NotAllowed, AR-001.

## How to call

```sh
capxul attendance-request create --company <company> --employee <employee> --fromDate <fromDate> --toDate <toDate> --reason <reason>
```

HTTP: `POST /attendance-request/create` with the payload as JSON. SDK: `Sdk.attendance-request.create(payload)`.
