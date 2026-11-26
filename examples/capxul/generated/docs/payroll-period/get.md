<!-- Generated from the blueprint. Do not edit. -->
# payroll-period.get

Read one payroll-period by its id: company, payrollPeriodName, startDate, endDate, state.

**Who may call:** the owner of its company.

**A read:** answered from the records, with no handler.

**Budget:** p95 50ms.

## Payload

| field | value |
|---|---|
| id | payroll-period.id |

## Answer

| field | value |
|---|---|
| company | payroll-period.company |
| payrollPeriodName | payroll-period.payrollPeriodName |
| startDate | payroll-period.startDate |
| endDate | payroll-period.endDate |
| state | text |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its company; the handler never runs |

## Worked examples

### set up payroll periods

Starts from the world `two companies`.

- **Bo can't read it.** `bo` (signed in) calls and sends id the last call's payrollPeriod, and is refused with NotAllowed, AR-001.
- **it reads back as set up.** `ada` (role company.owner) calls and sends id the last call's payrollPeriod, and gets back [the world's company, `2026`, `2026-04-01`, `2027-03-31`, `active`].
- **it reads back Acme Logistics'.** `ada` (role company.owner) calls and sends id the last call's payrollPeriod, and gets back [the world's otherCompany, `2026`].

## How to call

```sh
capxul payroll-period get --id <id>
```

HTTP: `POST /payroll-period/get` with the payload as JSON. SDK: `Sdk.payroll-period.get(payload)`.
