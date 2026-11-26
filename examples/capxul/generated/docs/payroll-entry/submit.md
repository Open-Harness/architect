<!-- Generated from the blueprint. Do not edit. -->
# payroll-entry.submit

Submit a payroll entry, making a draft salary slip for each of its employees.

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
| slips | EmployeeCount |

## Move

`submit`: from draft to submitted, emitting PayrollEntrySubmitted.

## Steps

- `payroll-entry.submit.load` (database)
- `payroll-entry.submit.slips` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| SalarySlipExists | 48 | PE-008 | declared in errors.ts, carrying employee |
| NoAssignmentAtStart | 49 | PE-009 | declared in errors.ts, carrying employee |
| PayrollEntryNotDraft | 40 | PE-900 | the payroll-entry is in a state submit can't start from; carries `state` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its payrollEntry.company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### check every slip first

Starts from the world `a third paid employee`.

- **Ada submits it: Eve's draft slip.** `ada` (role company.owner) calls and sends payrollEntry the last call's items 0 payrollEntry, and gets back `1`.
- **it can't be submitted: Eve's slip is judged before Cy's late assignment, though Cy comes first.** `ada` (role company.owner) calls and sends payrollEntry the last call's items 0 payrollEntry, and is refused with SalarySlipExists, PE-008, carrying employee the world's thirdEmployee.

### pay a month

Starts from the world `a pension component`.

- **Ada submits it: a draft slip for each.** `ada` (role company.owner) calls and sends payrollEntry the last call's items 0 payrollEntry, and gets back `2`.

### run a payroll

Starts from the world `an outside cost center`.

- **nor submit it.** `bo` (signed in) calls and sends payrollEntry the last call's items 0 payrollEntry, and is refused with NotAllowed, AR-001.
- **Ada submits it: one draft slip.** `ada` (role company.owner) calls and sends payrollEntry the last call's items 0 payrollEntry, and gets back `1`.
- **it can't be submitted twice.** `ada` (role company.owner) calls and sends payrollEntry the last call's payrollEntry, and is refused with PayrollEntryNotDraft, PE-900, carrying state `submitted`.
- **an accrued entry can't be submitted.** `ada` (role company.owner) calls and sends payrollEntry the last call's payrollEntry, and is refused with PayrollEntryNotDraft, PE-900, carrying state `accrued`.
- **X can't be submitted: Cy's assignment starts after 2 March, and the refusal names her.** `ada` (role company.owner) calls and sends payrollEntry the last call's items 4 id, and is refused with NoAssignmentAtStart, PE-009, carrying employee the world's secondEmployee.
- **Ada submits A: Olga's March slip.** `ada` (role company.owner) calls and sends payrollEntry the last call's items 2 id, and gets back `1`.
- **B can't be submitted: A's draft slip covers Olga's March, judged before Cy's late assignment.** `ada` (role company.owner) calls and sends payrollEntry the last call's items 3 id, and is refused with SalarySlipExists, PE-008, carrying employee the world's employee.
- **E can't be submitted either, Cy's assignment starting on 16 March.** `ada` (role company.owner) calls and sends payrollEntry the last call's items 0 payrollEntry, and is refused with NoAssignmentAtStart, PE-009, carrying employee the world's secondEmployee.
- **E can be submitted now.** `ada` (role company.owner) calls and sends payrollEntry the last call's items 6 id, and gets back `1`.
- **she submits April: three slips, Cy's too, and Dee's though she joined on the 8th.** `ada` (role company.owner) calls and sends payrollEntry the last call's items 7 id, and gets back `3`.
- **Ada submits it.** `ada` (role company.owner) calls and sends payrollEntry the last call's items 0 payrollEntry, and gets back `2`.
- **Ada submits it.** `ada` (role company.owner) calls and sends payrollEntry the last call's payrollEntry, and gets back `1`.
- **Ada submits it.** `ada` (role company.owner) calls and sends payrollEntry the last call's payrollEntry, and gets back `1`.
- **Ada submits it.** `ada` (role company.owner) calls and sends payrollEntry the last call's payrollEntry, and gets back `1`.
- **it can't be submitted: her latest structure has no assignment by 1 September, though another of hers has.** `ada` (role company.owner) calls and sends payrollEntry the last call's payrollEntry, and is refused with NoAssignmentAtStart, PE-009, carrying employee the world's employee.
- **Ada submits it.** `ada` (role company.owner) calls and sends payrollEntry the last call's payrollEntry, and gets back `1`.
- **D can't be submitted: A's submitted slip covers Olga, E's draft one Cy, and the first hire is named.** `ada` (role company.owner) calls and sends payrollEntry the last call's items 5 id, and is refused with SalarySlipExists, PE-008, carrying employee the world's employee.
- **and can be submitted: no slip covers those very days.** `ada` (role company.owner) calls and sends payrollEntry the last call's payrollEntry, and gets back `1`.
- **Ada submits it.** `ada` (role company.owner) calls and sends payrollEntry the last call's payrollEntry, and gets back `1`.
- **Ada submits it.** `ada` (role company.owner) calls and sends payrollEntry the last call's payrollEntry, and gets back `1`.
- **Ada submits it.** `ada` (role company.owner) calls and sends payrollEntry the last call's payrollEntry, and gets back `1`.
- **Ada submits it.** `ada` (role company.owner) calls and sends payrollEntry the last call's payrollEntry, and gets back `1`.

## How to call

```sh
capxul payroll-entry submit --payrollEntry <payrollEntry>
```

HTTP: `POST /payroll-entry/submit` with the payload as JSON. SDK: `Sdk.payroll-entry.submit(payload)`.
