<!-- Generated from the blueprint. Do not edit. -->
# leave-allocation.get

Read one leave-allocation by its id: company, employee, leaveType, fromDate, toDate, newLeavesAllocated, state.

**Who may call:** the self of its employee, or the owner of its company.

**A read:** answered from the records, with no handler.

**Budget:** p95 50ms.

## Payload

| field | value |
|---|---|
| id | leave-allocation.id |

## Answer

| field | value |
|---|---|
| company | leave-allocation.company |
| employee | leave-allocation.employee |
| leaveType | leave-allocation.leaveType |
| fromDate | leave-allocation.fromDate |
| toDate | leave-allocation.toDate |
| newLeavesAllocated | leave-allocation.newLeavesAllocated |
| state | text |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the self of its employee, or the owner of its company; the handler never runs |

## Worked examples

### allocate leave

Starts from the world `a leave type`.

- **Bo can't read it.** `bo` (signed in) calls and sends id the last call's leaveAllocation, and is refused with NotAllowed, AR-001.
- **Olga reads it back, as Ada typed it, with its half day.** `olga` (signed in) calls and sends id the last call's leaveAllocation, and gets back [the world's company, the world's employee, the world's leaveType, `2027-01-01`, `2027-06-30`, `10.5`, `submitted`].
- **it reads back as Sick Leave.** `ada` (role company.owner) calls and sends id the last call's leaveAllocation, and gets back [`2027-01-01`, `2027-06-30`, `7`, false, `submitted`].
- **and reads back as a quarter.** `ada` (role company.owner) calls and sends id the last call's leaveAllocation, and gets back [`2029-04-01`, `2029-04-01`, `0.25`].

## How to call

```sh
capxul leave-allocation get --id <id>
```

HTTP: `POST /leave-allocation/get` with the payload as JSON. SDK: `Sdk.leave-allocation.get(payload)`.
