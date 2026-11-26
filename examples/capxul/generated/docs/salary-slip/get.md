<!-- Generated from the blueprint. Do not edit. -->
# salary-slip.get

Read one salary-slip by its id: company, employee, payrollEntry, salaryStructure, postingDate, startDate, endDate, grossPay, totalDeduction, netPay, status, journalEntry.

**Who may call:** the self of its employee, or the owner of its company.

**A read:** answered from the records, with no handler.

**Budget:** p95 50ms.

## Payload

| field | value |
|---|---|
| id | salary-slip.id |

## Answer

| field | value | description |
|---|---|---|
| company | salary-slip.company |  |
| employee | salary-slip.employee |  |
| payrollEntry | salary-slip.payrollEntry |  |
| salaryStructure | salary-slip.salaryStructure |  |
| postingDate | salary-slip.postingDate |  |
| startDate | salary-slip.startDate |  |
| endDate | salary-slip.endDate |  |
| grossPay | salary-slip.grossPay |  |
| totalDeduction | salary-slip.totalDeduction |  |
| netPay | salary-slip.netPay | Its gross pay less its total deduction, in USDC base units. |
| status | salary-slip.status |  |
| journalEntry (optional) | salary-slip.journalEntry | The accrual journal entry that booked it, once its payroll entry submitted it. |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the self of its employee, or the owner of its company; the handler never runs |

## Worked examples

### pay a month

Starts from the world `a pension component`.

- **Cy can't read Olga's slip.** `cy` (signed in) calls and sends id the last call's items 0 salarySlip, and is refused with NotAllowed, AR-001.
- **nor Bo.** `bo` (signed in) calls and sends id the last call's items 0 salarySlip, and is refused with NotAllowed, AR-001.
- **Olga reads her own: a draft, booked to no journal entry yet.** `olga` (signed in) calls and sends id the last call's items 0 salarySlip, and gets back [the world's company, the world's employee, `Draft`, `3350000000`, true].

## How to call

```sh
capxul salary-slip get --id <id>
```

HTTP: `POST /salary-slip/get` with the payload as JSON. SDK: `Sdk.salary-slip.get(payload)`.
