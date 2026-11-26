<!-- Generated from the blueprint. Do not edit. -->
# payroll-period

A company's payroll year, the span its tax is worked out over.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| company | company.id |
| payrollPeriodName | PeriodName |
| startDate | Day |
| endDate | Day |

## Machine

States: active. A move from the wrong state is refused PayrollPeriodNotActive (exit 40).

| move | from | to | emits |
|---|---|---|---|
| create | (creates) | active | PayrollPeriodCreated |

## Invariants

- `payroll-period.oneNamePerCompany`: another payroll period holds this company and payroll period name. Unique on company, payrollPeriodName, in every state; refused PayrollPeriodNameTaken.

## Events

- `PayrollPeriodCreated`: carries payrollPeriod (payroll-period.id), company (payroll-period.company), startDate (payroll-period.startDate), endDate (payroll-period.endDate); emitted by the move create

## Operations

- [payroll-period.create](create.md): Set up a company's payroll period.
- [payroll-period.get](get.md): Read one payroll-period by its id: company, payrollPeriodName, startDate, endDate, state.
