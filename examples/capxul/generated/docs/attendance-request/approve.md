<!-- Generated from the blueprint. Do not edit. -->
# attendance-request.approve

Approve a request, marking each of its days.

**Who may call:** the owner of its attendanceRequest.company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 300ms.

## Payload

| field | value |
|---|---|
| attendanceRequest | attendance-request.id |

## Answer

| field | value |
|---|---|
| attendanceRequest | attendance-request.id |
| marked | DayCount |
| changed | DayCount |

## Move

`approve`: from draft to approved, emitting AttendanceRequestApproved.

## Steps

- `attendance-request.approve.load` (database)
- `attendance-request.approve.mark` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| AttendanceAlreadyMarked | 44 | AN-004 | another attendance holds this employee and attendance date; by the rule attendance.oneAttendancePerDay, carrying attendanceDate |
| AttendanceRequestNotDraft | 40 | AQ-900 | the attendance-request is in a state approve can't start from; carries `state` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its attendanceRequest.company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### approve an attendance request

Starts from the world `an attendance request`.

- **Olga can't approve her own request.** `olga` (signed in) calls and sends attendanceRequest the world's attendanceRequest, and is refused with NotAllowed, AR-001.
- **nor can Bo.** `bo` (signed in) calls and sends attendanceRequest the world's attendanceRequest, and is refused with NotAllowed, AR-001.
- **Ada approves it: two days are new, the absent Tuesday and the present Wednesday change, and Thursday is left as it was.** `ada` (role company.owner) calls and sends attendanceRequest the world's attendanceRequest, and gets back [the world's attendanceRequest, `2`, `2`].
- **it can't be approved twice.** `ada` (role company.owner) calls and sends attendanceRequest the world's attendanceRequest, and is refused with AttendanceRequestNotDraft, AQ-900, carrying state `approved`.
- **approved, the absent Monday and the half day change to present, and the present Tuesday is left: none is new.** `ada` (role company.owner) calls and sends attendanceRequest the last call's attendanceRequest, and gets back [`0`, `2`].
- **approved, it marks the Friday and Sunday and changes the half-day Saturday.** `ada` (role company.owner) calls and sends attendanceRequest the last call's attendanceRequest, and gets back [`2`, `1`].
- **approved, it marks that one day.** `ada` (role company.owner) calls and sends attendanceRequest the last call's attendanceRequest, and gets back [`1`, `0`].
- **approved, it marks both, across the year's end.** `ada` (role company.owner) calls and sends attendanceRequest the last call's attendanceRequest, and gets back [`2`, `0`].
- **approved, it marks three days, with no 29 February.** `ada` (role company.owner) calls and sends attendanceRequest the last call's attendanceRequest, and gets back [`3`, `0`].
- **approved, it marks 28 February and 1 March and changes 29 February to present.** `ada` (role company.owner) calls and sends attendanceRequest the last call's attendanceRequest, and gets back [`2`, `1`].
- **approved, it marks all forty.** `ada` (role company.owner) calls and sends attendanceRequest the last call's attendanceRequest, and gets back [`40`, `0`].
- **approved, it marks all three, the weekend too.** `ada` (role company.owner) calls and sends attendanceRequest the last call's attendanceRequest, and gets back [`3`, `0`].

### attendance stays in its company

Starts from the world `an attendance request`.

- **the request she made before leaving is still approved, marking its days.** `ada` (role company.owner) calls and sends attendanceRequest the world's attendanceRequest, and gets back [the world's attendanceRequest, `4`, `1`].

### reject an attendance request

Starts from the world `an attendance request`.

- **it can't then be approved.** `ada` (role company.owner) calls and sends attendanceRequest the world's attendanceRequest, and is refused with AttendanceRequestNotDraft, AQ-900, carrying state `rejected`.

## How to call

```sh
capxul attendance-request approve --attendanceRequest <attendanceRequest>
```

HTTP: `POST /attendance-request/approve` with the payload as JSON. SDK: `Sdk.attendance-request.approve(payload)`.
