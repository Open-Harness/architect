<!-- Generated from the blueprint. Do not edit. -->
# payroll-employee-detail.list

List payroll-employee-details, oldest first, 100 to a page, filtered by payrollEntry.

**Who may call:** the owner of its payrollEntry.company.

**A read:** answered from the records, with no handler. A page of 100 at a time, oldest first, narrowed by payrollEntry; pass the answer's `next` as `cursor` for the page after it.

**Budget:** p95 80ms.

## Payload

| field | value |
|---|---|
| payrollEntry (optional) | payroll-employee-detail.payrollEntry |
| cursor (optional) | text |

## Answer

| field | value |
|---|---|
| items | schema |
| next | schema |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its payrollEntry.company; the handler never runs |

## Worked examples

### check every slip first

Starts from the world `a third paid employee`.

- **it holds Eve.** `ada` (role company.owner) calls and sends payrollEntry the last call's payrollEntry, and gets back [the world's thirdEmployee].
- **Cy first, then Eve.** `ada` (role company.owner) calls and sends payrollEntry the last call's payrollEntry, and gets back [the world's secondEmployee, the world's thirdEmployee].

### pay a month

Starts from the world `a pension component`.

- **it holds Olga, then Cy, in the order they were hired.** `ada` (role company.owner) calls and sends payrollEntry the last call's payrollEntry, and gets back [the world's employee, the world's secondEmployee].

### run a payroll

Starts from the world `an outside cost center`.

- **it holds Olga.** `ada` (role company.owner) calls and sends payrollEntry the last call's payrollEntry, and gets back [the world's employee].
- **Bo can't list its employees.** `bo` (signed in) calls and sends payrollEntry the last call's items 0 payrollEntry, and is refused with NotAllowed, AR-001.
- **it holds Cy.** `ada` (role company.owner) calls and sends payrollEntry the last call's payrollEntry, and gets back [the world's secondEmployee].
- **it holds them.** `ada` (role company.owner) calls and sends payrollEntry the last call's payrollEntry, and gets back 3.
- **it holds Olga and Dee.** `ada` (role company.owner) calls and sends payrollEntry the last call's payrollEntry, and gets back 2.
- **May's employees: Olga, then Dee.** `ada` (role company.owner) calls and sends payrollEntry the last call's items 3 payrollEntry, and gets back [the world's employee, the last call's items 1 employee].

## How to call

```sh
capxul payroll-employee-detail list [--payrollEntry <payrollEntry>] [--cursor <cursor>]
```

HTTP: `POST /payroll-employee-detail/list` with the payload as JSON. SDK: `Sdk.payroll-employee-detail.list(payload)`.
