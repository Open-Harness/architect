<!-- Generated from the blueprint. Do not edit. -->
# leave-type.create

Add a kind of leave a company gives.

**Who may call:** the owner of its company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

| field | value | description |
|---|---|---|
| company | leave-type.company |  |
| leaveTypeName | leave-type.leaveTypeName |  |
| maxContinuousDaysAllowed | leave-type.maxContinuousDaysAllowed |  |
| isLwp | leave-type.isLwp | Leave without pay: never allocated, and taken with no balance. |
| includeHoliday | leave-type.includeHoliday | Holidays inside a leave count as leave days. |

## Answer

| field | value |
|---|---|
| leaveType | leave-type.id |

## Move

`create`: from nothing (it creates) to active, emitting LeaveTypeCreated.

## Steps

- `leave-type.create.insert` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| LeaveTypeNameTaken | 41 | LT-001 | another leave type holds this company and leave type name; by the rule leave-type.oneNamePerCompany, carrying leaveTypeName |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### allocate leave

Starts from the world `a leave type`.

- **Ada adds Sick Leave.** `ada` (role company.owner) calls and sends company the world's company, leaveTypeName `SICK-LV`, maxContinuousDaysAllowed `0`, isLwp false, includeHoliday true, and gets back an answer matching `^lty_[0-9a-z]+$`.
- **Ada adds Leave Without Pay.** `ada` (role company.owner) calls and sends company the world's company, leaveTypeName `UNPAID-LV`, maxContinuousDaysAllowed `0`, isLwp true, includeHoliday false, and gets back an answer matching `^lty_[0-9a-z]+$`.

### leave balance

Starts from the world `a leave allocation`.

- **Ada adds Sick Leave, holidays counted, no limit.** `ada` (role company.owner) calls and sends company the world's company, leaveTypeName `SICK-LV`, maxContinuousDaysAllowed `0`, isLwp false, includeHoliday true, with the request key `sick`, and gets back an answer matching `^lty_[0-9a-z]+$`.
- **Ada looks up Sick Leave.** `ada` (role company.owner) calls and sends company the world's company, leaveTypeName `SICK-LV`, maxContinuousDaysAllowed `0`, isLwp false, includeHoliday true, with the request key `sick`, and gets back an answer matching `^lty_[0-9a-z]+$`.
- **Ada looks up Sick Leave, again.** `ada` (role company.owner) calls and sends company the world's company, leaveTypeName `SICK-LV`, maxContinuousDaysAllowed `0`, isLwp false, includeHoliday true, with the request key `sick`, and gets back an answer matching `^lty_[0-9a-z]+$`.
- **Ada looks up Sick Leave, a third time.** `ada` (role company.owner) calls and sends company the world's company, leaveTypeName `SICK-LV`, maxContinuousDaysAllowed `0`, isLwp false, includeHoliday true, with the request key `sick`, and gets back an answer matching `^lty_[0-9a-z]+$`.
- **Ada adds Leave Without Pay.** `ada` (role company.owner) calls and sends company the world's company, leaveTypeName `UNPAID-LV`, maxContinuousDaysAllowed `0`, isLwp true, includeHoliday true, with the request key `unpaid`, and gets back an answer matching `^lty_[0-9a-z]+$`.
- **Ada looks up Leave Without Pay.** `ada` (role company.owner) calls and sends company the world's company, leaveTypeName `UNPAID-LV`, maxContinuousDaysAllowed `0`, isLwp true, includeHoliday true, with the request key `unpaid`, and gets back an answer matching `^lty_[0-9a-z]+$`.

### leave days

Starts from the world `a leave allocation`.

- **Ada adds Sick Leave, holidays counted.** `ada` (role company.owner) calls and sends company the world's company, leaveTypeName `SICK-LV`, maxContinuousDaysAllowed `0`, isLwp false, includeHoliday true, with the request key `sick`, and gets back an answer matching `^lty_[0-9a-z]+$`.
- **Ada looks up Sick Leave.** `ada` (role company.owner) calls and sends company the world's company, leaveTypeName `SICK-LV`, maxContinuousDaysAllowed `0`, isLwp false, includeHoliday true, with the request key `sick`, and gets back an answer matching `^lty_[0-9a-z]+$`.
- **Ada adds Leave Without Pay.** `ada` (role company.owner) calls and sends company the world's company, leaveTypeName `UNPAID-LV`, maxContinuousDaysAllowed `0`, isLwp true, includeHoliday false, with the request key `unpaid`, and gets back an answer matching `^lty_[0-9a-z]+$`.

### leave stays in its company

Starts from the world `a leave application`.

- **and adds Annual Leave to it.** `bo` (signed in) calls and sends company the last call's company, leaveTypeName `ANNUAL-LV`, maxContinuousDaysAllowed `0`, isLwp false, includeHoliday false, with the request key `bo-annual`, and gets back an answer matching `^lty_[0-9a-z]+$`.

### overlapping leave

Starts from the world `a leave application`.

- **Ada adds Sick Leave, at most 2 days in a row.** `ada` (role company.owner) calls and sends company the world's company, leaveTypeName `SICK-LV`, maxContinuousDaysAllowed `2`, isLwp false, includeHoliday true, with the request key `sick`, and gets back an answer matching `^lty_[0-9a-z]+$`.
- **Ada looks up Sick Leave.** `ada` (role company.owner) calls and sends company the world's company, leaveTypeName `SICK-LV`, maxContinuousDaysAllowed `2`, isLwp false, includeHoliday true, with the request key `sick`, and gets back an answer matching `^lty_[0-9a-z]+$`.
- **Ada looks up Sick Leave again.** `ada` (role company.owner) calls and sends company the world's company, leaveTypeName `SICK-LV`, maxContinuousDaysAllowed `2`, isLwp false, includeHoliday true, with the request key `sick`, and gets back an answer matching `^lty_[0-9a-z]+$`.
- **Ada looks up Sick Leave a third time.** `ada` (role company.owner) calls and sends company the world's company, leaveTypeName `SICK-LV`, maxContinuousDaysAllowed `2`, isLwp false, includeHoliday true, with the request key `sick`, and gets back an answer matching `^lty_[0-9a-z]+$`.
- **Ada looks up Sick Leave a fourth time.** `ada` (role company.owner) calls and sends company the world's company, leaveTypeName `SICK-LV`, maxContinuousDaysAllowed `2`, isLwp false, includeHoliday true, with the request key `sick`, and gets back an answer matching `^lty_[0-9a-z]+$`.
- **Ada adds Study Leave, unpaid, with no limit.** `ada` (role company.owner) calls and sends company the world's company, leaveTypeName `STUDY-LV`, maxContinuousDaysAllowed `0`, isLwp true, includeHoliday true, and gets back an answer matching `^lty_[0-9a-z]+$`.

### set up leave types

Starts from the world `an employee`.

- **Ada adds Annual Leave: at most 5 days in a row, paid, holidays not counted.** `ada` (role company.owner) calls and sends company the world's company, leaveTypeName `ANNUAL-LV`, maxContinuousDaysAllowed `5`, isLwp false, includeHoliday false, and gets back an answer matching `^lty_[0-9a-z]+$`.
- **Ada adds Leave Without Pay: no limit, unpaid, holidays counted.** `ada` (role company.owner) calls and sends company the world's company, leaveTypeName `UNPAID-LV`, maxContinuousDaysAllowed `0`, isLwp true, includeHoliday true, and gets back an answer matching `^lty_[0-9a-z]+$`.
- **Ada adds a sick leave type, its name in lower case: at most 12 days in a row, paid, holidays counted.** `ada` (role company.owner) calls and sends company the world's company, leaveTypeName `sick-lv, lower`, maxContinuousDaysAllowed `12`, isLwp false, includeHoliday true, and gets back an answer matching `^lty_[0-9a-z]+$`.
- **Ada adds Study Leave: unpaid, holidays not counted, at most 400 days in a row.** `ada` (role company.owner) calls and sends company the world's company, leaveTypeName `STUDY-LV`, maxContinuousDaysAllowed `400`, isLwp true, includeHoliday false, and gets back an answer matching `^lty_[0-9a-z]+$`.
- **Annual Leave can't be added twice to Acme Trading.** `ada` (role company.owner) calls and sends company the world's company, leaveTypeName `ANNUAL-LV`, maxContinuousDaysAllowed `10`, isLwp false, includeHoliday true, and is refused with LeaveTypeNameTaken, LT-001, carrying leaveTypeName `ANNUAL-LV`.
- **Olga can't add a leave type.** `olga` (signed in) calls and sends company the world's company, leaveTypeName `OLGA-LV`, maxContinuousDaysAllowed `0`, isLwp false, includeHoliday false, and is refused with NotAllowed, AR-001.
- **nor can Bo, to Acme Trading.** `bo` (signed in) calls and sends company the world's company, leaveTypeName `BO-LV`, maxContinuousDaysAllowed `0`, isLwp false, includeHoliday false, and is refused with NotAllowed, AR-001.
- **Bo can add Annual Leave to his own company, though Acme Trading has one.** `bo` (signed in) calls and sends company the last call's company, leaveTypeName `ANNUAL-LV`, maxContinuousDaysAllowed `3`, isLwp false, includeHoliday true, and gets back an answer matching `^lty_[0-9a-z]+$`.

## How to call

```sh
capxul leave-type create --company <company> --leaveTypeName <leaveTypeName> --maxContinuousDaysAllowed <maxContinuousDaysAllowed> --isLwp <isLwp> --includeHoliday <includeHoliday>
```

HTTP: `POST /leave-type/create` with the payload as JSON. SDK: `Sdk.leave-type.create(payload)`.
