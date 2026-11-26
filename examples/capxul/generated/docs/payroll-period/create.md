<!-- Generated from the blueprint. Do not edit. -->
# payroll-period.create

Set up a company's payroll period.

**Who may call:** the owner of its company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| company | payroll-period.company |
| payrollPeriodName | payroll-period.payrollPeriodName |
| startDate | payroll-period.startDate |
| endDate | payroll-period.endDate |

## Answer

| field | value |
|---|---|
| payrollPeriod | payroll-period.id |

## Move

`create`: from nothing (it creates) to active, emitting PayrollPeriodCreated.

## Steps

- `payroll-period.create.load` (database)
- `payroll-period.create.insert` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| PayrollPeriodEndsBeforeStart | 41 | PP-001 | declared in errors.ts, carrying startDate |
| PayrollPeriodOverlaps | 42 | PP-002 | declared in errors.ts, carrying payrollPeriod |
| PayrollPeriodNameTaken | 43 | PP-003 | another payroll period holds this company and payroll period name; by the rule payroll-period.oneNamePerCompany |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### pay a month

Starts from the world `a pension component`.

- **Ada sets up the payroll period 2026.** `ada` (role company.owner) calls and sends company the world's company, payrollPeriodName `2026`, startDate `2026-01-01`, endDate `2026-12-31`, and is answered.

### set up payroll periods

Starts from the world `two companies`.

- **Bo can't set up a period for Acme Trading.** `bo` (signed in) calls and sends company the world's company, payrollPeriodName `2026`, startDate `2026-01-01`, endDate `2026-12-31`, and is refused with NotAllowed, AR-001.
- **a period ending before it starts is refused, naming its first day.** `ada` (role company.owner) calls and sends company the world's company, payrollPeriodName `Backwards`, startDate `2026-12-31`, endDate `2026-12-30`, and is refused with PayrollPeriodEndsBeforeStart, PP-001, carrying startDate `2026-12-31`.
- **Ada sets up 2026, from April 2026 to March 2027.** `ada` (role company.owner) calls and sends company the world's company, payrollPeriodName `2026`, startDate `2026-04-01`, endDate `2027-03-31`, and is answered.
- **a one-day period is allowed.** `ada` (role company.owner) calls and sends company the world's company, payrollPeriodName `Audit day`, startDate `2027-04-01`, endDate `2027-04-01`, and is answered.
- **a period sharing only 2026's last day is refused.** `ada` (role company.owner) calls and sends company the world's company, payrollPeriodName `Overlap end`, startDate `2027-03-31`, endDate `2027-03-31`, and is refused with PayrollPeriodOverlaps, PP-002.
- **one ending on 2026's first day too.** `ada` (role company.owner) calls and sends company the world's company, payrollPeriodName `Overlap start`, startDate `2026-03-01`, endDate `2026-04-01`, and is refused with PayrollPeriodOverlaps, PP-002.
- **one inside it too.** `ada` (role company.owner) calls and sends company the world's company, payrollPeriodName `Inside`, startDate `2026-06-01`, endDate `2026-06-30`, and is refused with PayrollPeriodOverlaps, PP-002.
- **but one ending the day before it is allowed.** `ada` (role company.owner) calls and sends company the world's company, payrollPeriodName `2025`, startDate `2025-04-01`, endDate `2026-03-31`, and is answered.
- **one holding 2025, 2026 and the audit day names 2025, which starts first.** `ada` (role company.owner) calls and sends company the world's company, payrollPeriodName `Everything`, startDate `2025-01-01`, endDate `2027-12-31`, and is refused with PayrollPeriodOverlaps, PP-002, carrying payrollPeriod the last call's payrollPeriod.
- **a period ending before it starts is judged before an overlap.** `ada` (role company.owner) calls and sends company the world's company, payrollPeriodName `Backwards`, startDate `2026-06-30`, endDate `2026-06-01`, and is refused with PayrollPeriodEndsBeforeStart, PP-001, carrying startDate `2026-06-30`.
- **a name already used is refused.** `ada` (role company.owner) calls and sends company the world's company, payrollPeriodName `2026`, startDate `2030-01-01`, endDate `2030-12-31`, and is refused with PayrollPeriodNameTaken, PP-003.
- **an overlap is judged before a name.** `ada` (role company.owner) calls and sends company the world's company, payrollPeriodName `2026`, startDate `2026-05-01`, endDate `2026-05-31`, and is refused with PayrollPeriodOverlaps, PP-002.
- **Acme Logistics may have its own 2026 over the same days: each company's periods are its own.** `ada` (role company.owner) calls and sends company the world's otherCompany, payrollPeriodName `2026`, startDate `2026-04-01`, endDate `2027-03-31`, and is answered.

## How to call

```sh
capxul payroll-period create --company <company> --payrollPeriodName <payrollPeriodName> --startDate <startDate> --endDate <endDate>
```

HTTP: `POST /payroll-period/create` with the payload as JSON. SDK: `Sdk.payroll-period.create(payload)`.
