<!-- Generated from the blueprint. Do not edit. -->
# salary-slip

One employee's pay for a payroll entry's days: their earnings, deductions and net pay.

Lives in the database.

## Fields

| field | value | description |
|---|---|---|
| id | id |  |
| company | company.id |  |
| employee | employee.id |  |
| payrollEntry | payroll-entry.id |  |
| salaryStructure | salary-structure.id |  |
| postingDate | Day |  |
| startDate | Day |  |
| endDate | Day |  |
| grossPay | Amount |  |
| totalDeduction | Amount |  |
| netPay | Balance | Its gross pay less its total deduction, in USDC base units. |
| status | SlipStatus |  |
| journalEntry (optional) | journal-entry.id | The accrual journal entry that booked it, once its payroll entry submitted it. |

## Operations

- [salary-slip.get](get.md): Read one salary-slip by its id: company, employee, payrollEntry, salaryStructure, postingDate, startDate, endDate, grossPay, totalDeduction, netPay, status, journalEntry.
- [salary-slip.list](list.md): List salary-slips, oldest first, 100 to a page, filtered by employee, payrollEntry.
