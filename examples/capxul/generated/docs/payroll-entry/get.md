<!-- Generated from the blueprint. Do not edit. -->
# payroll-entry.get

Read one payroll-entry by its id: company, postingDate, startDate, endDate, costCenter, payrollPayableAccount, numberOfEmployees, state.

**Who may call:** the owner of its company.

**A read:** answered from the records, with no handler.

**Budget:** p95 50ms.

## Payload

| field | value |
|---|---|
| id | payroll-entry.id |

## Answer

| field | value | description |
|---|---|---|
| company | payroll-entry.company |  |
| postingDate | payroll-entry.postingDate | The day its salary slips and accrual journal entry are posted. |
| startDate | payroll-entry.startDate |  |
| endDate | payroll-entry.endDate |  |
| costCenter | payroll-entry.costCenter |  |
| payrollPayableAccount | payroll-entry.payrollPayableAccount | The ledger the net pay is credited to, owed to the employees until it is paid. |
| numberOfEmployees | payroll-entry.numberOfEmployees |  |
| state | text |  |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its company; the handler never runs |

## Worked examples

### pay a month

Starts from the world `a pension component`.

- **Bo can't read it.** `bo` (signed in) calls and sends id the last call's payrollEntry, and is refused with NotAllowed, AR-001.
- **it reads back submitted, as it was drafted.** `ada` (role company.owner) calls and sends id the last call's payrollEntry, and gets back [the world's company, `2026-03-31`, `2026-03-01`, `2026-03-31`, the world's costCenter, the world's payable, `2`, `submitted`].

### run a payroll

Starts from the world `an outside cost center`.

- **Bo can't read it.** `bo` (signed in) calls and sends id the last call's payrollEntry, and is refused with NotAllowed, AR-001.
- **nor can Olga.** `olga` (signed in) calls and sends id the last call's payrollEntry, and is refused with NotAllowed, AR-001.
- **the entry stays submitted.** `ada` (role company.owner) calls and sends id the last call's items 8 id, and gets back [`2027-01-04`, `2`, `submitted`].

## How to call

```sh
capxul payroll-entry get --id <id>
```

HTTP: `POST /payroll-entry/get` with the payload as JSON. SDK: `Sdk.payroll-entry.get(payload)`.
