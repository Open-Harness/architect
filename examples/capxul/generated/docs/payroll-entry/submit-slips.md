<!-- Generated from the blueprint. Do not edit. -->
# payroll-entry.submit-slips

Submit a payroll entry's salary slips, booking their pay in one accrual journal entry.

**Who may call:** the owner of its payrollEntry.company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 500ms.

## Payload

| field | value |
|---|---|
| payrollEntry | payroll-entry.id |

## Answer

| field | value |
|---|---|
| payrollEntry | payroll-entry.id |
| journalEntry | journal-entry.id |
| slips | EmployeeCount |

## Move

`submitSlips`: from submitted to accrued, emitting SalarySlipsSubmitted.

## Steps

- `payroll-entry.submit-slips.load` (database)
- `payroll-entry.submit-slips.accrue` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| AccrualOutsideFiscalYear | 50 | PE-010 | declared in errors.ts, carrying postingDate |
| PayrollEntryNotDraft | 40 | PE-900 | the payroll-entry is in a state submitSlips can't start from; carries `state` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its payrollEntry.company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### pay a month

Starts from the world `a pension component`.

- **Bo can't submit the slips.** `bo` (signed in) calls and sends payrollEntry the last call's payrollEntry, and is refused with NotAllowed, AR-001.
- **Ada submits them: one accrual journal entry, submitted.** `ada` (role company.owner) calls and sends payrollEntry the last call's payrollEntry, and gets back `2`.

### run a payroll

Starts from the world `an outside cost center`.

- **a draft's slips can't be submitted.** `ada` (role company.owner) calls and sends payrollEntry the last call's items 0 payrollEntry, and is refused with PayrollEntryNotDraft, PE-900, carrying state `draft`.
- **Bo can't submit the slips.** `bo` (signed in) calls and sends payrollEntry the last call's items 0 payrollEntry, and is refused with NotAllowed, AR-001.
- **Ada submits them: one accrual journal entry.** `ada` (role company.owner) calls and sends payrollEntry the last call's items 0 payrollEntry, and gets back `1`.
- **nor its slips again.** `ada` (role company.owner) calls and sends payrollEntry the last call's payrollEntry, and is refused with PayrollEntryNotDraft, PE-900, carrying state `accrued`.
- **she submits A's slips.** `ada` (role company.owner) calls and sends payrollEntry the last call's items 2 id, and gets back `1`.
- **Ada submits April's slips.** `ada` (role company.owner) calls and sends payrollEntry the last call's items 0 payrollEntry, and gets back `3`.
- **its slips can't be booked: 4 January 2027 is in none of Acme Trading's fiscal years, though Acme Logistics', and the refusal names it.** `ada` (role company.owner) calls and sends payrollEntry the last call's items 8 id, and is refused with AccrualOutsideFiscalYear, PE-010, carrying postingDate `2027-01-04`.
- **and its slips.** `ada` (role company.owner) calls and sends payrollEntry the last call's payrollEntry, and gets back `1`.
- **its slips are booked: the year's last day counts.** `ada` (role company.owner) calls and sends payrollEntry the last call's payrollEntry, and gets back `1`.
- **its slips are booked: the year's first day counts.** `ada` (role company.owner) calls and sends payrollEntry the last call's payrollEntry, and gets back `1`.
- **and its slips.** `ada` (role company.owner) calls and sends payrollEntry the last call's payrollEntry, and gets back `1`.
- **and its slips.** `ada` (role company.owner) calls and sends payrollEntry the last call's payrollEntry, and gets back `1`.
- **and its slips.** `ada` (role company.owner) calls and sends payrollEntry the last call's payrollEntry, and gets back `1`.
- **and its slips.** `ada` (role company.owner) calls and sends payrollEntry the last call's payrollEntry, and gets back `1`.

## How to call

```sh
capxul payroll-entry submit-slips --payrollEntry <payrollEntry>
```

HTTP: `POST /payroll-entry/submit-slips` with the payload as JSON. SDK: `Sdk.payroll-entry.submit-slips(payload)`.
