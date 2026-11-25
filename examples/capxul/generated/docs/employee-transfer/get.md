<!-- Generated from the blueprint. Do not edit. -->
# employee-transfer.get

Read one employee-transfer by its id: company, employee, transferDate, currentDepartment, newDepartment, state.

**Who may call:** the self of its employee, or the owner of its company.

**A read:** answered from the records, with no handler.

**Budget:** p95 50ms.

## Payload

| field | value |
|---|---|
| id | employee-transfer.id |

## Answer

| field | value | description |
|---|---|---|
| company | employee-transfer.company |  |
| employee | employee-transfer.employee |  |
| transferDate | employee-transfer.transferDate |  |
| currentDepartment | employee-transfer.currentDepartment | The department the employee held when the transfer was drafted. |
| newDepartment | employee-transfer.newDepartment | The department the employee holds once it is submitted. |
| state | text |  |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the self of its employee, or the owner of its company; the handler never runs |

## Worked examples

### transfer an employee

Starts from the world `a second transfer`.

- **Olga's transfer reads back a draft, from Engineering to Platform, from 14 December.** `ada` (role company.owner) calls and sends id the world's employeeTransfer, and gets back [the world's company, the world's employee, `2026-12-14`, the world's department, the world's secondDepartment, `draft`].
- **Olga reads her own.** `olga` (signed in) calls and sends id the world's employeeTransfer, and gets back [the world's employee, the world's department, the world's secondDepartment, `draft`].
- **Cy can't read Olga's.** `cy` (signed in) calls and sends id the world's employeeTransfer, and is refused with NotAllowed, AR-001.
- **nor can Bo.** `bo` (signed in) calls and sends id the world's employeeTransfer, and is refused with NotAllowed, AR-001.
- **it copied the department she works in now, Platform.** `ada` (role company.owner) calls and sends id the last call's employeeTransfer, and gets back [the world's company, the world's employee, `2026-12-21`, the world's secondDepartment, the world's department, `draft`].
- **the transfer reads back cancelled, its departments kept.** `ada` (role company.owner) calls and sends id the world's employeeTransfer, and gets back [the world's department, the world's secondDepartment, `cancelled`].

## How to call

```sh
capxul employee-transfer get --id <id>
```

HTTP: `POST /employee-transfer/get` with the payload as JSON. SDK: `Sdk.employee-transfer.get(payload)`.
