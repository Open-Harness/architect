<!-- Generated from the blueprint. Do not edit. -->
# leave-allocation.create

Give an employee leave days of one type, between two days, as a draft.

**Who may call:** the owner of its company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 200ms.

## Payload

| field | value |
|---|---|
| company | leave-allocation.company |
| employee | leave-allocation.employee |
| leaveType | leave-allocation.leaveType |
| fromDate | leave-allocation.fromDate |
| toDate | leave-allocation.toDate |
| newLeavesAllocated | leave-allocation.newLeavesAllocated |

## Answer

| field | value |
|---|---|
| leaveAllocation | leave-allocation.id |

## Move

`create`: from nothing (it creates) to draft, emitting LeaveAllocationCreated.

## Steps

- `leave-allocation.create.load` (database)
- `leave-allocation.create.insert` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| AllocateeNotInCompany | 41 | LL-001 | declared in errors.ts |
| AllocateeHasLeft | 42 | LL-002 | declared in errors.ts |
| AllocationTypeNotInCompany | 43 | LL-003 | declared in errors.ts |
| AllocationEndsBeforeStart | 44 | LL-004 | declared in errors.ts, carrying fromDate |
| AllocationOverlaps | 45 | LL-005 | declared in errors.ts |
| LeaveWithoutPayNotAllocated | 46 | LL-006 | declared in errors.ts |
| NoLeavesAllocated | 47 | LL-007 | declared in errors.ts |
| AllocationExceedsPeriod | 48 | LL-008 | declared in errors.ts |
| EmployeeNotFound | 4 | EM-901 | nothing has the id in employee; the handler never runs; carries `id` |
| LeaveTypeNotFound | 4 | LT-901 | nothing has the id in leaveType; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### allocate leave

Starts from the world `a leave type`.

- **Ada gives Olga ten and a half days of Annual Leave for the first half of 2027.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2027-01-01`, toDate `2027-06-30`, newLeavesAllocated { value: `105`, scale: 1 }, and gets back an answer matching `^lal_[0-9a-z]+$`.
- **nor give Olga leave in Acme Trading.** `bo` (signed in) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2027-07-01`, toDate `2027-12-31`, newLeavesAllocated { value: `1`, scale: 0 }, and is refused with NotAllowed, AR-001.
- **an allocation sharing its last day is refused.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2027-06-30`, toDate `2027-07-31`, newLeavesAllocated { value: `1`, scale: 0 }, and is refused with AllocationOverlaps, LL-005.
- **so is one sharing its first day.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2026-12-01`, toDate `2027-01-01`, newLeavesAllocated { value: `1`, scale: 0 }, and is refused with AllocationOverlaps, LL-005.
- **and one around it.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2026-12-01`, toDate `2027-12-31`, newLeavesAllocated { value: `1`, scale: 0 }, and is refused with AllocationOverlaps, LL-005.
- **and one inside it.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2027-03-01`, toDate `2027-03-31`, newLeavesAllocated { value: `1`, scale: 0 }, and is refused with AllocationOverlaps, LL-005.
- **the second half of 2027, from the day after, is allowed.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2027-07-01`, toDate `2027-12-31`, newLeavesAllocated { value: `5`, scale: 0 }, and gets back an answer matching `^lal_[0-9a-z]+$`.
- **so is the second half of 2026, ending the day before.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2026-07-01`, toDate `2026-12-31`, newLeavesAllocated { value: `5`, scale: 0 }, and gets back an answer matching `^lal_[0-9a-z]+$`.
- **and gives Olga Sick Leave over the same days as her first Annual Leave.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, leaveType the last call's leaveType, fromDate `2027-01-01`, toDate `2027-06-30`, newLeavesAllocated { value: `7`, scale: 0 }, and gets back an answer matching `^lal_[0-9a-z]+$`.
- **Ada drafts Annual Leave for the first half of 2028.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2028-01-01`, toDate `2028-06-30`, newLeavesAllocated { value: `3`, scale: 0 }, with the request key `draft-2028-first-half`, and is answered.
- **and drafts one from March to December 2028 too: drafts don't overlap.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2028-03-01`, toDate `2028-12-31`, newLeavesAllocated { value: `3`, scale: 0 }, and gets back an answer matching `^lal_[0-9a-z]+$`.
- **one for October 2028, inside it, is refused.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2028-10-01`, toDate `2028-10-31`, newLeavesAllocated { value: `1`, scale: 0 }, and is refused with AllocationOverlaps, LL-005.
- **one for January and February 2028 is allowed, ending the day before it.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2028-01-01`, toDate `2028-02-29`, newLeavesAllocated { value: `2`, scale: 0 }, and is answered.
- **Ada sends the first-half draft again under its request key, and gets the same draft back.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2028-01-01`, toDate `2028-06-30`, newLeavesAllocated { value: `3`, scale: 0 }, with the request key `draft-2028-first-half`, and is answered.
- **and gives him Annual Leave on Olga's days: another employee doesn't overlap.** `ada` (role company.owner) calls and sends company the world's company, employee the last call's employee, leaveType the world's leaveType, fromDate `2027-01-01`, toDate `2027-06-30`, newLeavesAllocated { value: `4`, scale: 0 }, and gets back an answer matching `^lal_[0-9a-z]+$`.
- **an allocation ending the day before it starts, across a year's end, is refused.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2030-01-01`, toDate `2029-12-31`, newLeavesAllocated { value: `1`, scale: 0 }, and is refused with AllocationEndsBeforeStart, LL-004, carrying fromDate `2030-01-01`.
- **so is one ending the day before it starts inside a month.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2029-03-05`, toDate `2029-03-04`, newLeavesAllocated { value: `1`, scale: 0 }, and is refused with AllocationEndsBeforeStart, LL-004, carrying fromDate `2029-03-05`.
- **one starting and ending on 5 March 2029, with one day, is allowed.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2029-03-05`, toDate `2029-03-05`, newLeavesAllocated { value: `1`, scale: 0 }, and is answered.
- **no leaves are refused.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2029-04-01`, toDate `2029-04-30`, newLeavesAllocated { value: `0`, scale: 0 }, and is refused with NoLeavesAllocated, LL-007.
- **and fewer than none.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2029-04-01`, toDate `2029-04-30`, newLeavesAllocated { value: `-1`, scale: 0 }, and is refused with NoLeavesAllocated, LL-007.
- **a quarter of a day is allowed.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2029-04-01`, toDate `2029-04-01`, newLeavesAllocated { value: `25`, scale: 2 }, and is answered.
- **three days and a hundredth over three days are refused.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2029-05-01`, toDate `2029-05-03`, newLeavesAllocated { value: `301`, scale: 2 }, and is refused with AllocationExceedsPeriod, LL-008.
- **three days over three days are allowed.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2029-05-01`, toDate `2029-05-03`, newLeavesAllocated { value: `3`, scale: 0 }, and is answered.
- **five over the four days across a month's end are refused.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2029-05-30`, toDate `2029-06-02`, newLeavesAllocated { value: `5`, scale: 0 }, and is refused with AllocationExceedsPeriod, LL-008.
- **four over them are allowed.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2029-05-30`, toDate `2029-06-02`, newLeavesAllocated { value: `4`, scale: 0 }, and is answered.
- **three over 28 February to 1 March 2029, two days, are refused.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2029-02-28`, toDate `2029-03-01`, newLeavesAllocated { value: `3`, scale: 0 }, and is refused with AllocationExceedsPeriod, LL-008.
- **a draft overlapping a submitted one, with no leaves, is refused for its overlap first.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2027-06-01`, toDate `2027-06-30`, newLeavesAllocated { value: `0`, scale: 0 }, and is refused with AllocationOverlaps, LL-005.
- **it can't be allocated.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, leaveType the last call's leaveType, fromDate `2027-01-01`, toDate `2027-12-31`, newLeavesAllocated { value: `5`, scale: 0 }, and is refused with LeaveWithoutPayNotAllocated, LL-006.
- **not even with no leaves, which it is refused for first.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, leaveType the last call's leaveType, fromDate `2027-01-01`, toDate `2027-12-31`, newLeavesAllocated { value: `0`, scale: 0 }, and is refused with LeaveWithoutPayNotAllocated, LL-006.
- **nor with an end before its start, which it is refused for first.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, leaveType the last call's leaveType, fromDate `2027-01-02`, toDate `2027-01-01`, newLeavesAllocated { value: `1`, scale: 0 }, and is refused with AllocationEndsBeforeStart, LL-004, carrying fromDate `2027-01-02`.
- **nor with more leaves than days.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, leaveType the last call's leaveType, fromDate `2027-01-01`, toDate `2027-01-02`, newLeavesAllocated { value: `9`, scale: 0 }, and is refused with LeaveWithoutPayNotAllocated, LL-006.

### leave balance

Starts from the world `a leave allocation`.

- **and gives Olga two and a half days of it for 2027.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, leaveType the last call's leaveType, fromDate `2027-01-01`, toDate `2027-12-31`, newLeavesAllocated { value: `25`, scale: 1 }, with the request key `sick-2027`, and gets back an answer matching `^lal_[0-9a-z]+$`.
- **Ada gives Olga 1 day of Annual Leave for 2028.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2028-01-01`, toDate `2028-12-31`, newLeavesAllocated { value: `1`, scale: 0 }, with the request key `annual-2028`, and gets back an answer matching `^lal_[0-9a-z]+$`.
- **Ada drafts 5 days of Annual Leave for 2029, and doesn't submit it.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2029-01-01`, toDate `2029-12-31`, newLeavesAllocated { value: `5`, scale: 0 }, with the request key `draft-2029`, and gets back an answer matching `^lal_[0-9a-z]+$`.

### leave days

Starts from the world `a leave allocation`.

- **and gives Olga 3 days of it for 2027.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, leaveType the last call's leaveType, fromDate `2027-01-01`, toDate `2027-12-31`, newLeavesAllocated { value: `3`, scale: 0 }, and gets back an answer matching `^lal_[0-9a-z]+$`.

### leave stays in its company

Starts from the world `a leave application`.

- **Ada can't give Olga Bo's Annual Leave.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, leaveType the last call's leaveType, fromDate `2028-01-01`, toDate `2028-12-31`, newLeavesAllocated { value: `2`, scale: 0 }, and is refused with AllocationTypeNotInCompany, LL-003.
- **even ending before it starts, which it is refused for after.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, leaveType the last call's leaveType, fromDate `2028-01-02`, toDate `2028-01-01`, newLeavesAllocated { value: `2`, scale: 0 }, and is refused with AllocationTypeNotInCompany, LL-003.
- **Bo can't give Olga leave in Bo Ltd, with Acme Trading's type, for her company first.** `bo` (signed in) calls and sends company the last call's company, employee the world's employee, leaveType the world's leaveType, fromDate `2028-01-01`, toDate `2028-12-31`, newLeavesAllocated { value: `2`, scale: 0 }, and is refused with AllocateeNotInCompany, LL-001.
- **Ada drafts Olga's Annual Leave for 2028.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2028-01-01`, toDate `2028-12-31`, newLeavesAllocated { value: `2`, scale: 0 }, with the request key `olga-2028`, and is answered.
- **Ada can't give her new leave.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2029-01-01`, toDate `2029-12-31`, newLeavesAllocated { value: `2`, scale: 0 }, and is refused with AllocateeHasLeft, LL-002.
- **even ending before it starts, which it is refused for after, a third time.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2029-01-02`, toDate `2029-01-01`, newLeavesAllocated { value: `2`, scale: 0 }, and is refused with AllocateeHasLeft, LL-002.
- **Bo can't give her leave in Bo Ltd, for her company first.** `bo` (signed in) calls and sends company the last call's company, employee the world's employee, leaveType the world's leaveType, fromDate `2029-01-01`, toDate `2029-12-31`, newLeavesAllocated { value: `2`, scale: 0 }, and is refused with AllocateeNotInCompany, LL-001.
- **Ada sends the 2028 draft again under its request key, and gets it back.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, leaveType the world's leaveType, fromDate `2028-01-01`, toDate `2028-12-31`, newLeavesAllocated { value: `2`, scale: 0 }, with the request key `olga-2028`, and is answered.

### overlapping leave

Starts from the world `a leave application`.

- **and gives Olga 5 days of it for 2027.** `ada` (role company.owner) calls and sends company the world's company, employee the world's employee, leaveType the last call's leaveType, fromDate `2027-01-01`, toDate `2027-12-31`, newLeavesAllocated { value: `5`, scale: 0 }, and gets back an answer matching `^lal_[0-9a-z]+$`.
- **and gives him 5 days of Annual Leave for 2027.** `ada` (role company.owner) calls and sends company the world's company, employee the last call's employee, leaveType the world's leaveType, fromDate `2027-01-01`, toDate `2027-12-31`, newLeavesAllocated { value: `5`, scale: 0 }, and gets back an answer matching `^lal_[0-9a-z]+$`.

## How to call

```sh
capxul leave-allocation create --company <company> --employee <employee> --leaveType <leaveType> --fromDate <fromDate> --toDate <toDate> --newLeavesAllocated <newLeavesAllocated>
```

HTTP: `POST /leave-allocation/create` with the payload as JSON. SDK: `Sdk.leave-allocation.create(payload)`.
