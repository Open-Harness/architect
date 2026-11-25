<!-- Generated from the blueprint. Do not edit. -->
# payroll-entry.create

Draft a payroll entry for a span of days, filled with the company's employees to pay.

**Who may call:** the owner of its company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 300ms.

## Payload

| field | value | description |
|---|---|---|
| company | payroll-entry.company |  |
| postingDate | payroll-entry.postingDate | The day its salary slips and accrual journal entry are posted. |
| startDate | payroll-entry.startDate |  |
| endDate | payroll-entry.endDate |  |
| costCenter | payroll-entry.costCenter |  |
| payrollPayableAccount | payroll-entry.payrollPayableAccount | The ledger the net pay is credited to, owed to the employees until it is paid. |

## Answer

| field | value |
|---|---|
| payrollEntry | payroll-entry.id |
| numberOfEmployees | payroll-entry.numberOfEmployees |

## Move

`create`: from nothing (it creates) to draft, emitting PayrollEntryDrafted.

## Steps

- `payroll-entry.create.load` (database)
- `payroll-entry.create.insert` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| PayrollEndsBeforeStart | 41 | PE-001 | declared in errors.ts, carrying startDate |
| PayableAccountNotInCompany | 42 | PE-002 | declared in errors.ts |
| PayableAccountIsGroup | 43 | PE-003 | declared in errors.ts |
| PayableAccountHasType | 44 | PE-004 | declared in errors.ts |
| PayrollCostCenterNotInCompany | 45 | PE-005 | declared in errors.ts |
| PayrollCostCenterIsGroup | 46 | PE-006 | declared in errors.ts |
| NoEmployeesFound | 47 | PE-007 | declared in errors.ts |
| CostCenterNotFound | 4 | CC-901 | nothing has the id in costCenter; the handler never runs; carries `id` |
| AccountNotFound | 4 | AC-901 | nothing has the id in payrollPayableAccount; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### check every slip first

Starts from the world `a third paid employee`.

- **February's first payroll holds Eve alone.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2026-02-28`, startDate `2026-02-01`, endDate `2026-02-28`, costCenter the world's costCenter, payrollPayableAccount the world's payable, and gets back `1`.
- **February's second payroll holds Cy and Eve: a draft slip doesn't keep Eve out.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2026-02-28`, startDate `2026-02-01`, endDate `2026-02-28`, costCenter the world's costCenter, payrollPayableAccount the world's payable, and gets back `2`.

### pay a month

Starts from the world `a pension component`.

- **she drafts March's payroll: both employees.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2026-03-31`, startDate `2026-03-01`, endDate `2026-03-31`, costCenter the world's costCenter, payrollPayableAccount the world's payable, and gets back `2`.

### run a payroll

Starts from the world `an outside cost center`.

- **Bo can't draft Acme Trading's payroll.** `bo` (signed in) calls and sends company the world's company, postingDate `2026-02-28`, startDate `2026-02-01`, endDate `2026-02-28`, costCenter the world's costCenter, payrollPayableAccount the world's payable, and is refused with NotAllowed, AR-001.
- **a payroll ending before it starts is refused, naming its first day.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2026-02-01`, startDate `2026-02-28`, endDate `2026-02-01`, costCenter the world's costCenter, payrollPayableAccount the world's payable, and is refused with PayrollEndsBeforeStart, PE-001, carrying startDate `2026-02-28`.
- **net pay owed on a group is refused.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2026-02-28`, startDate `2026-02-01`, endDate `2026-02-28`, costCenter the world's costCenter, payrollPayableAccount the world's liabilities, and is refused with PayableAccountIsGroup, PE-003.
- **so is net pay owed on an account with a type: Bank.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2026-02-28`, startDate `2026-02-01`, endDate `2026-02-28`, costCenter the world's costCenter, payrollPayableAccount the world's bank, and is refused with PayableAccountHasType, PE-004.
- **net pay owed on it is refused too: any account type is.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2026-02-28`, startDate `2026-02-01`, endDate `2026-02-28`, costCenter the world's costCenter, payrollPayableAccount the last call's account, and is refused with PayableAccountHasType, PE-004.
- **the days are judged before the account.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2026-02-01`, startDate `2026-02-28`, endDate `2026-02-01`, costCenter the world's costCenter, payrollPayableAccount the world's liabilities, and is refused with PayrollEndsBeforeStart, PE-001, carrying startDate `2026-02-28`.
- **a group cost center is refused.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2026-02-28`, startDate `2026-02-01`, endDate `2026-02-28`, costCenter the world's mainCostCenter, payrollPayableAccount the world's payable, and is refused with PayrollCostCenterIsGroup, PE-006.
- **the account is judged before the cost center.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2026-02-28`, startDate `2026-02-01`, endDate `2026-02-28`, costCenter the world's mainCostCenter, payrollPayableAccount the world's bank, and is refused with PayableAccountHasType, PE-004.
- **December 2025, before anyone joined, finds no one to pay.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2025-12-31`, startDate `2025-12-01`, endDate `2025-12-31`, costCenter the world's costCenter, payrollPayableAccount the world's payable, and is refused with NoEmployeesFound, PE-007.
- **the cost center is judged before the employees.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2025-12-31`, startDate `2025-12-01`, endDate `2025-12-31`, costCenter the world's mainCostCenter, payrollPayableAccount the world's payable, and is refused with PayrollCostCenterIsGroup, PE-006.
- **net pay can't be owed on Acme Logistics' Payroll Payable.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2026-02-28`, startDate `2026-02-01`, endDate `2026-02-28`, costCenter the world's costCenter, payrollPayableAccount the world's otherPayable, and is refused with PayableAccountNotInCompany, PE-002.
- **nor on its Liabilities: another company's is refused before a group.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2026-02-28`, startDate `2026-02-01`, endDate `2026-02-28`, costCenter the world's costCenter, payrollPayableAccount the world's otherLiabilities, and is refused with PayableAccountNotInCompany, PE-002.
- **nor booked in Acme Logistics' Transport.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2026-02-28`, startDate `2026-02-01`, endDate `2026-02-28`, costCenter the world's otherCostCenter, payrollPayableAccount the world's payable, and is refused with PayrollCostCenterNotInCompany, PE-005.
- **Acme Logistics' March payroll finds no one: Bo has no assignment, and Acme Trading's employees aren't its own.** `ada` (role company.owner) calls and sends company the world's otherCompany, postingDate `2026-03-31`, startDate `2026-03-01`, endDate `2026-03-31`, costCenter the world's otherCostCenter, payrollPayableAccount the world's otherPayable, and is refused with NoEmployeesFound, PE-007.
- **nor can Acme Logistics' payroll owe on Acme Trading's Payroll Payable.** `ada` (role company.owner) calls and sends company the world's otherCompany, postingDate `2026-03-31`, startDate `2026-03-01`, endDate `2026-03-31`, costCenter the world's otherCostCenter, payrollPayableAccount the world's payable, and is refused with PayableAccountNotInCompany, PE-002.
- **Ada drafts February's payroll: Olga alone, as Cy has no assignment.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2026-02-28`, startDate `2026-02-01`, endDate `2026-02-28`, costCenter the world's costCenter, payrollPayableAccount the world's payable, and gets back `1`.
- **February again finds no one: Olga is paid for these very days.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2026-02-28`, startDate `2026-02-01`, endDate `2026-02-28`, costCenter the world's costCenter, payrollPayableAccount the world's payable, and is refused with NoEmployeesFound, PE-007.
- **February still finds no one: a draft assignment doesn't count.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2026-02-28`, startDate `2026-02-01`, endDate `2026-02-28`, costCenter the world's costCenter, payrollPayableAccount the world's payable, and is refused with NoEmployeesFound, PE-007.
- **but 2 to 28 February are other days, so it holds her.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2026-02-28`, startDate `2026-02-02`, endDate `2026-02-28`, costCenter the world's costCenter, payrollPayableAccount the world's payable, and gets back `1`.
- **Ada drafts March's payroll, A: Olga alone.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2026-03-31`, startDate `2026-03-01`, endDate `2026-03-31`, costCenter the world's costCenter, payrollPayableAccount the world's payable, and gets back `1`.
- **February still finds no one: Cy's submitted assignment starts after it.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2026-02-28`, startDate `2026-02-01`, endDate `2026-02-28`, costCenter the world's costCenter, payrollPayableAccount the world's payable, and is refused with NoEmployeesFound, PE-007.
- **March's payroll B holds Olga and Cy: Cy's assignment starts by the last day.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2026-03-31`, startDate `2026-03-01`, endDate `2026-03-31`, costCenter the world's costCenter, payrollPayableAccount the world's payable, and gets back `2`.
- **so does X, from 2 to 31 March.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2026-03-31`, startDate `2026-03-02`, endDate `2026-03-31`, costCenter the world's costCenter, payrollPayableAccount the world's payable, and gets back `2`.
- **a draft slip doesn't keep Olga out of a new March payroll, D.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2026-03-31`, startDate `2026-03-01`, endDate `2026-03-31`, costCenter the world's costCenter, payrollPayableAccount the world's payable, and gets back `2`.
- **a submitted slip does: March's payroll E holds Cy alone.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2026-03-31`, startDate `2026-03-01`, endDate `2026-03-31`, costCenter the world's costCenter, payrollPayableAccount the world's payable, and gets back `1`.
- **April's payroll holds Olga, Cy and Dee, in the order they were hired.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2026-04-30`, startDate `2026-04-01`, endDate `2026-04-30`, costCenter the world's costCenter, payrollPayableAccount the world's payable, and gets back `3`.
- **May's payroll, posted on 4 January 2027, skips Cy, who has left.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2027-01-04`, startDate `2026-05-01`, endDate `2026-05-31`, costCenter the world's costCenter, payrollPayableAccount the world's payable, and gets back `2`.
- **June's payroll holds Olga alone.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2026-06-30`, startDate `2026-06-01`, endDate `2026-06-30`, costCenter the world's costCenter, payrollPayableAccount the world's payable, and gets back `1`.
- **July's payroll, posted on 31 December, the fiscal year's last day, holds Olga.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2026-12-31`, startDate `2026-07-01`, endDate `2026-07-31`, costCenter the world's costCenter, payrollPayableAccount the world's payable, and gets back `1`.
- **August's payroll, posted on 1 January, the fiscal year's first day, holds Olga.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2026-01-01`, startDate `2026-08-01`, endDate `2026-08-31`, costCenter the world's costCenter, payrollPayableAccount the world's payable, and gets back `1`.
- **September's payroll holds Olga.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2026-09-30`, startDate `2026-09-01`, endDate `2026-09-30`, costCenter the world's costCenter, payrollPayableAccount the world's payable, and gets back `1`.
- **October's payroll holds Olga.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2026-10-31`, startDate `2026-10-01`, endDate `2026-10-31`, costCenter the world's costCenter, payrollPayableAccount the world's payable, and gets back `1`.
- **1 to 27 February are other days than her paid February: it holds Olga.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2026-02-27`, startDate `2026-02-01`, endDate `2026-02-27`, costCenter the world's costCenter, payrollPayableAccount the world's payable, and gets back `1`.
- **a one-day payroll is allowed.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2026-02-28`, startDate `2026-02-28`, endDate `2026-02-28`, costCenter the world's costCenter, payrollPayableAccount the world's payable, and gets back `1`.
- **1 to 15 November's payroll holds Olga.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2026-11-15`, startDate `2026-11-01`, endDate `2026-11-15`, costCenter the world's costCenter, payrollPayableAccount the world's payable, and gets back `1`.
- **16 to 30 November's payroll holds Olga.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2026-11-30`, startDate `2026-11-16`, endDate `2026-11-30`, costCenter the world's costCenter, payrollPayableAccount the world's payable, and gets back `1`.
- **1 to 15 December's payroll holds Olga.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2026-12-15`, startDate `2026-12-01`, endDate `2026-12-15`, costCenter the world's costCenter, payrollPayableAccount the world's payable, and gets back `1`.
- **16 to 31 December's payroll holds Olga.** `ada` (role company.owner) calls and sends company the world's company, postingDate `2026-12-31`, startDate `2026-12-16`, endDate `2026-12-31`, costCenter the world's costCenter, payrollPayableAccount the world's payable, and gets back `1`.

## How to call

```sh
capxul payroll-entry create --company <company> --postingDate <postingDate> --startDate <startDate> --endDate <endDate> --costCenter <costCenter> --payrollPayableAccount <payrollPayableAccount>
```

HTTP: `POST /payroll-entry/create` with the payload as JSON. SDK: `Sdk.payroll-entry.create(payload)`.
