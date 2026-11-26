<!-- Generated from the blueprint. Do not edit. -->
# attendance-request.get

Read one attendance-request by its id: company, employee, fromDate, toDate, reason, state.

**Who may call:** the self of its employee, or the owner of its company.

**A read:** answered from the records, with no handler.

**Budget:** p95 50ms.

## Payload

| field | value |
|---|---|
| id | attendance-request.id |

## Answer

| field | value |
|---|---|
| company | attendance-request.company |
| employee | attendance-request.employee |
| fromDate | attendance-request.fromDate |
| toDate | attendance-request.toDate |
| reason | attendance-request.reason |
| state | text |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the self of its employee, or the owner of its company; the handler never runs |

## Worked examples

### approve an attendance request

Starts from the world `an attendance request`.

- **the request reads back approved, as she asked it.** `olga` (signed in) calls and sends id the world's attendanceRequest, and gets back [the world's company, the world's employee, `2026-11-23`, `2026-11-27`, `Work From Home`, `approved`].

### reject an attendance request

Starts from the world `an attendance request`.

- **it reads back rejected, as she asked it.** `olga` (signed in) calls and sends id the world's attendanceRequest, and gets back [the world's company, the world's employee, `2026-11-23`, `2026-11-27`, `Work From Home`, `rejected`].

### request attendance

Starts from the world `an employee`.

- **Bo can't read it.** `bo` (signed in) calls and sends id the last call's attendanceRequest, and is refused with NotAllowed, AR-001.
- **it reads back as she typed it, a draft.** `olga` (signed in) calls and sends id the last call's attendanceRequest, and gets back [the world's company, the world's employee, `2026-11-02`, `2026-11-04`, `Work From Home`, `draft`].
- **Ada reads it back on duty, a draft.** `ada` (role company.owner) calls and sends id the last call's attendanceRequest, and gets back [the world's company, the world's employee, `2026-11-09`, `2026-11-09`, `On Duty`, `draft`].
- **it reads back from the day she joined.** `olga` (signed in) calls and sends id the last call's attendanceRequest, and gets back [`2026-01-05`, `2026-01-06`, `On Duty`, `draft`].

## How to call

```sh
capxul attendance-request get --id <id>
```

HTTP: `POST /attendance-request/get` with the payload as JSON. SDK: `Sdk.attendance-request.get(payload)`.
