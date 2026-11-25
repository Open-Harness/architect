<!-- Generated from the blueprint. Do not edit. -->
# employee-transfer.create

Draft a transfer: an employee's new department, from a day.

**Who may call:** the owner of its company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

| field | value | description |
|---|---|---|
| company | employee-transfer.company |  |
| employee | employee-transfer.employee |  |
| transferDate | employee-transfer.transferDate |  |
| newDepartment | employee-transfer.newDepartment | The department the employee holds once it is submitted. |

## Answer

| field | value |
|---|---|
| employeeTransfer | employee-transfer.id |

## Move

`create`: from nothing (it creates) to draft, emitting EmployeeTransferDrafted.

## Steps

- `employee-transfer.create.load` (database)
- `employee-transfer.create.insert` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| TransferredEmployeeNotInCompany | 41 | TR-001 | declared in errors.ts |
| TransferredEmployeeHasLeft | 42 | TR-002 | declared in errors.ts |
| NewDepartmentNotInCompany | 43 | TR-003 | declared in errors.ts |
| DepartmentUnchanged | 44 | TR-004 | declared in errors.ts |
| EmployeeNotFound | 4 | EM-901 | nothing has the id in employee; the handler never runs; carries `id` |
| DepartmentNotFound | 4 | DE-901 | nothing has the id in newDepartment; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### move an employee through the company

Starts from the world `a new hire`.

- **Ada drafts Dee's transfer to Platform, from today too.** `ada` (role company.owner) calls and sends company the world's company, employee the world's newHire, transferDate `2026-12-01`, newDepartment the world's secondDepartment, and gets back an answer matching `^etr_[0-9a-z]+$`.

### transfer an employee

Starts from the world `a second transfer`.

- **Bo can't draft a transfer in Acme Trading.** `bo` (signed in) calls and sends company the world's company, employee the world's secondEmployee, transferDate `2026-12-01`, newDepartment the world's secondDepartment, and is refused with NotAllowed, AR-001.
- **Ada can't draft Olga's transfer to Platform again, where she now works.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, transferDate `2026-12-21`, newDepartment the world's secondDepartment, and is refused with DepartmentUnchanged, TR-004.
- **but she may draft one back to Engineering.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, transferDate `2026-12-21`, newDepartment the world's department, and gets back an answer matching `^etr_[0-9a-z]+$`.
- **Ada can't draft Olga's transfer to Engineering, where she works.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, transferDate `2026-12-21`, newDepartment the world's department, and is refused with DepartmentUnchanged, TR-004.
- **Ada can't move Olga into Acme Logistics' Logistics: a transfer stays in its company.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, transferDate `2026-12-21`, newDepartment the world's otherDepartment, and is refused with NewDepartmentNotInCompany, TR-003.
- **Ada can't transfer Bo in Acme Trading, where he doesn't work.** `ada` (role company.owner) calls and sends company the world's company, employee the world's outsider, transferDate `2026-12-21`, newDepartment the world's secondDepartment, and is refused with TransferredEmployeeNotInCompany, TR-001.
- **nor send Bo, at Acme Logistics, to Acme Trading's Platform.** `ada` (role company.owner) calls and sends company the world's otherCompany, employee the world's outsider, transferDate `2026-12-21`, newDepartment the world's secondDepartment, and is refused with NewDepartmentNotInCompany, TR-003.
- **Olga in Acme Logistics is refused for the employee's company, which is judged before the department's.** `ada` (role company.owner) calls and sends company the world's otherCompany, employee the world's employee, transferDate `2026-12-21`, newDepartment the world's secondDepartment, and is refused with TransferredEmployeeNotInCompany, TR-001.
- **Ada can't transfer Bo now he has left, which is judged before the department's company.** `ada` (role company.owner) calls and sends company the world's otherCompany, employee the world's outsider, transferDate `2026-12-21`, newDepartment the world's secondDepartment, and is refused with TransferredEmployeeHasLeft, TR-002.
- **in Acme Trading he is refused for the company first.** `ada` (role company.owner) calls and sends company the world's company, employee the world's outsider, transferDate `2026-12-21`, newDepartment the world's secondDepartment, and is refused with TransferredEmployeeNotInCompany, TR-001.
- **Ada can't draft a new one for Cy now she has left, which is judged before the department she works in.** `ada` (role company.owner) calls and sends company the world's company, employee the world's secondEmployee, transferDate `2026-12-21`, newDepartment the world's secondDepartment, and is refused with TransferredEmployeeHasLeft, TR-002.

## How to call

```sh
capxul employee-transfer create --company <company> --employee <employee> --transferDate <transferDate> --newDepartment <newDepartment>
```

HTTP: `POST /employee-transfer/create` with the payload as JSON. SDK: `Sdk.employee-transfer.create(payload)`.
