<!-- Generated from the blueprint. Do not edit. -->
# attendance.get

Read one attendance by its id: company, employee, attendanceDate, status, state.

**Who may call:** the self of its employee, or the owner of its company.

**A read:** answered from the records, with no handler.

**Budget:** p95 50ms.

## Payload

| field | value |
|---|---|
| id | attendance.id |

## Answer

| field | value |
|---|---|
| company | attendance.company |
| employee | attendance.employee |
| attendanceDate | attendance.attendanceDate |
| status | attendance.status |
| state | text |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the self of its employee, or the owner of its company; the handler never runs |

## Worked examples

### mark attendance

Starts from the world `an employee`.

- **Olga reads it back.** `olga` (signed in) calls and sends id the last call's attendance, and gets back [the world's company, the world's employee, `2026-11-02`, `Present`, `marked`].
- **Bo can't read it.** `bo` (signed in) calls and sends id the last call's attendance, and is refused with NotAllowed, AR-001.
- **Ada reads it back absent.** `ada` (role company.owner) calls and sends id the last call's attendance, and gets back [the world's company, the world's employee, `2026-11-03`, `Absent`, `marked`].
- **it reads back a half day.** `olga` (signed in) calls and sends id the last call's attendance, and gets back [`2026-11-04`, `Half Day`].
- **it reads back working from home.** `olga` (signed in) calls and sends id the last call's attendance, and gets back [`2026-11-05`, `Work From Home`].
- **Olga can't read Bo's.** `olga` (signed in) calls and sends id the last call's attendance, and is refused with NotAllowed, AR-001.
- **Bo reads his own, absent on 2 November.** `bo` (signed in) calls and sends id the last call's attendance, and gets back [the world's company, `2026-11-02`, `Absent`, `marked`].

## How to call

```sh
capxul attendance get --id <id>
```

HTTP: `POST /attendance/get` with the payload as JSON. SDK: `Sdk.attendance.get(payload)`.
