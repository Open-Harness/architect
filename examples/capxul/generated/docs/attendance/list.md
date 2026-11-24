<!-- Generated from the blueprint. Do not edit. -->
# attendance.list

List attendances, oldest first, 50 to a page, filtered by employee, attendanceDate.

**Who may call:** the self of its employee, or the owner of its employee.company.

**A read:** answered from the records, with no handler. A page of 50 at a time, oldest first, narrowed by employee, attendanceDate; pass the answer's `next` as `cursor` for the page after it.

**Budget:** p95 80ms.

## Payload

| field | value |
|---|---|
| employee (optional) | attendance.employee |
| attendanceDate (optional) | attendance.attendanceDate |
| cursor (optional) | text |

## Answer

| field | value |
|---|---|
| items | schema |
| next | schema |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the self of its employee, or the owner of its employee.company; the handler never runs |

## Worked examples

### approve an attendance request

Starts from the world `an attendance request`.

- **Olga's week reads working from home each day of the request, and the days either side as they were.** `olga` (signed in) calls and sends employee the world's employee, and gets back [[`2026-11-22`, `Present`, the world's company, the world's employee, `marked`], [`2026-11-23`, `Work From Home`, the world's company, the world's employee, `marked`], [`2026-11-24`, `Work From Home`, the world's company, the world's employee, `marked`], [`2026-11-25`, `Work From Home`, the world's company, the world's employee, `marked`], [`2026-11-26`, `Work From Home`, the world's company, the world's employee, `marked`], [`2026-11-27`, `Work From Home`, the world's company, the world's employee, `marked`], [`2026-11-28`, `Absent`, the world's company, the world's employee, `marked`]] and gets back [the world's attendance].
- **Bo can't list them.** `bo` (signed in) calls and sends employee the world's employee, and is refused with NotAllowed, AR-001.
- **Ada finds 29 February present, in Acme Trading.** `ada` (role company.owner) calls and sends employee the world's employee, attendanceDate `2028-02-29`, and gets back [[the world's company, the world's employee, `2028-02-29`, `Present`, `marked`]].
- **every day Olga was marked, each with the status its request or Ada gave it.** `olga` (signed in) calls and sends employee the world's employee, and gets back [[`2026-11-22`, `Present`, the world's company, the world's employee, `marked`], [`2026-11-23`, `Work From Home`, the world's company, the world's employee, `marked`], [`2026-11-24`, `Work From Home`, the world's company, the world's employee, `marked`], [`2026-11-25`, `Work From Home`, the world's company, the world's employee, `marked`], [`2026-11-26`, `Work From Home`, the world's company, the world's employee, `marked`], [`2026-11-27`, `Work From Home`, the world's company, the world's employee, `marked`], [`2026-11-28`, `Absent`, the world's company, the world's employee, `marked`], [`2026-11-30`, `Present`, the world's company, the world's employee, `marked`], [`2026-12-01`, `Present`, the world's company, the world's employee, `marked`], [`2026-12-02`, `Present`, the world's company, the world's employee, `marked`], [`2026-12-04`, `Work From Home`, the world's company, the world's employee, `marked`], [`2026-12-05`, `Work From Home`, the world's company, the world's employee, `marked`], [`2026-12-06`, `Work From Home`, the world's company, the world's employee, `marked`], [`2026-12-07`, `Work From Home`, the world's company, the world's employee, `marked`], [`2026-12-31`, `Work From Home`, the world's company, the world's employee, `marked`], [`2027-01-01`, `Work From Home`, the world's company, the world's employee, `marked`], [`2027-02-27`, `Work From Home`, the world's company, the world's employee, `marked`], [`2027-02-28`, `Work From Home`, the world's company, the world's employee, `marked`], [`2027-03-01`, `Work From Home`, the world's company, the world's employee, `marked`], [`2028-02-28`, `Present`, the world's company, the world's employee, `marked`], [`2028-02-29`, `Present`, the world's company, the world's employee, `marked`], [`2028-03-01`, `Present`, the world's company, the world's employee, `marked`]].
- **its last day, 10 May, is marked working from home.** `ada` (role company.owner) calls and sends employee the world's employee, attendanceDate `2027-05-10`, and gets back [[`2027-05-10`, `Work From Home`, `marked`]].
- **Saturday 12 December is marked present.** `ada` (role company.owner) calls and sends employee the world's employee, attendanceDate `2026-12-12`, and gets back [[`2026-12-12`, `Present`, `marked`]].

### attendance stays in its company

Starts from the world `an attendance request`.

- **every day it marked is Olga's, in Ada's company.** `ada` (role company.owner) calls and sends employee the world's employee, and gets back [[the world's company, the world's employee, `2026-11-23`, `Work From Home`], [the world's company, the world's employee, `2026-11-24`, `Work From Home`], [the world's company, the world's employee, `2026-11-25`, `Work From Home`], [the world's company, the world's employee, `2026-11-26`, `Work From Home`], [the world's company, the world's employee, `2026-11-27`, `Work From Home`]].

### mark attendance

Starts from the world `an employee`.

- **Olga's attendances list every day marked, each as it was marked.** `olga` (signed in) calls and sends employee the world's employee, and gets back [[`2026-01-05`, `Present`, the world's company, the world's employee, `marked`], [`2026-11-02`, `Present`, the world's company, the world's employee, `marked`], [`2026-11-03`, `Absent`, the world's company, the world's employee, `marked`], [`2026-11-04`, `Half Day`, the world's company, the world's employee, `marked`], [`2026-11-05`, `Work From Home`, the world's company, the world's employee, `marked`], [`2027-03-01`, `Absent`, the world's company, the world's employee, `marked`]].
- **Bo can't list them.** `bo` (signed in) calls and sends employee the world's employee, and is refused with NotAllowed, AR-001.
- **Olga's 2 November is still present, and hers alone.** `ada` (role company.owner) calls and sends employee the world's employee, attendanceDate `2026-11-02`, and gets back [[the world's employee, `2026-11-02`, `Present`]].

### reject an attendance request

Starts from the world `an attendance request`.

- **it marked nothing, and left each day in its range as it was.** `olga` (signed in) calls and sends employee the world's employee, and gets back [[`2026-11-24`, `Absent`], [`2026-11-25`, `Present`], [`2026-11-26`, `Work From Home`]] and gets back [the world's attendance].

### request attendance

Starts from the world `an employee`.

- **a request in draft marks no day.** `olga` (signed in) calls and sends employee the world's employee, and gets back 0.

## How to call

```sh
capxul attendance list [--employee <employee>] [--attendanceDate <attendanceDate>] [--cursor <cursor>]
```

HTTP: `POST /attendance/list` with the payload as JSON. SDK: `Sdk.attendance.list(payload)`.
