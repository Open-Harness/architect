<!-- Generated from the blueprint. Do not edit. -->
# payroll-entry

A company's pay run for a span of days: its employees' salary slips, and the journal entry that books them.

Lives in the database.

## Fields

| field | value | description |
|---|---|---|
| id | id |  |
| company | company.id |  |
| postingDate | Day | The day its salary slips and accrual journal entry are posted. |
| startDate | Day |  |
| endDate | Day |  |
| costCenter | cost-center.id |  |
| payrollPayableAccount | account.id | The ledger the net pay is credited to, owed to the employees until it is paid. |
| numberOfEmployees | EmployeeCount |  |

## Machine

States: draft, submitted, accrued. A move from the wrong state is refused PayrollEntryNotDraft (exit 40).

| move | from | to | emits |
|---|---|---|---|
| create | (creates) | draft | PayrollEntryDrafted |
| submit | draft | submitted | PayrollEntrySubmitted |
| submitSlips | submitted | accrued | SalarySlipsSubmitted |

## Events

- `PayrollEntryDrafted`: carries payrollEntry (payroll-entry.id), company (payroll-entry.company), numberOfEmployees (payroll-entry.numberOfEmployees); emitted by the move create
- `PayrollEntrySubmitted`: carries payrollEntry (payroll-entry.id), slips (EmployeeCount); emitted by the move submit
- `SalarySlipsSubmitted`: carries payrollEntry (payroll-entry.id), journalEntry (journal-entry.id), slips (EmployeeCount); emitted by the move submitSlips

## Operations

- [payroll-entry.create](create.md): Draft a payroll entry for a span of days, filled with the company's employees to pay.
- [payroll-entry.get](get.md): Read one payroll-entry by its id: company, postingDate, startDate, endDate, costCenter, payrollPayableAccount, numberOfEmployees, state.
- [payroll-entry.list](list.md): List payroll-entrys, oldest first, 50 to a page, filtered by company.
- [payroll-entry.submit](submit.md): Submit a payroll entry, making a draft salary slip for each of its employees.
- [payroll-entry.submit-slips](submit-slips.md): Submit a payroll entry's salary slips, booking their pay in one accrual journal entry.
