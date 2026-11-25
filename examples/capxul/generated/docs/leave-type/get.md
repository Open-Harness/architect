<!-- Generated from the blueprint. Do not edit. -->
# leave-type.get

Read one leave-type by its id: company, leaveTypeName, maxContinuousDaysAllowed, isLwp, includeHoliday, state.

**Who may call:** the owner of its company.

**A read:** answered from the records, with no handler.

**Budget:** p95 50ms.

## Payload

| field | value |
|---|---|
| id | leave-type.id |

## Answer

| field | value | description |
|---|---|---|
| company | leave-type.company |  |
| leaveTypeName | leave-type.leaveTypeName |  |
| maxContinuousDaysAllowed | leave-type.maxContinuousDaysAllowed |  |
| isLwp | leave-type.isLwp | Leave without pay: never allocated, and taken with no balance. |
| includeHoliday | leave-type.includeHoliday | Holidays inside a leave count as leave days. |
| state | text |  |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its company; the handler never runs |

## Worked examples

### set up leave types

Starts from the world `an employee`.

- **it reads back as she typed it.** `ada` (role company.owner) calls and sends id the last call's leaveType, and gets back [the world's company, `ANNUAL-LV`, `5`, false, false, `active`].
- **it reads back with no limit, unpaid and holidays counted.** `ada` (role company.owner) calls and sends id the last call's leaveType, and gets back [the world's company, `UNPAID-LV`, `0`, true, true, `active`].
- **it reads back as typed.** `ada` (role company.owner) calls and sends id the last call's leaveType, and gets back [the world's company, `sick-lv, lower`, `12`, false, true, `active`].
- **it reads back unpaid with holidays not counted.** `ada` (role company.owner) calls and sends id the last call's leaveType, and gets back [the world's company, `STUDY-LV`, `400`, true, false, `active`].
- **Ada can't read Bo's.** `ada` (role company.owner) calls and sends id the last call's leaveType, and is refused with NotAllowed, AR-001.
- **Bo reads his back, in his own company, as he typed it.** `bo` (signed in) calls and sends id the last call's leaveType, and gets back [`ANNUAL-LV`, `3`, false, true, false].

## How to call

```sh
capxul leave-type get --id <id>
```

HTTP: `POST /leave-type/get` with the payload as JSON. SDK: `Sdk.leave-type.get(payload)`.
