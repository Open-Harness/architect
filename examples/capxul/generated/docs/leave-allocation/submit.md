<!-- Generated from the blueprint. Do not edit. -->
# leave-allocation.submit

Submit an allocation, so its leave days can be taken.

**Who may call:** the owner of its leaveAllocation.company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 200ms.

## Payload

| field | value |
|---|---|
| leaveAllocation | leave-allocation.id |

## Answer

| field | value |
|---|---|
| leaveAllocation | leave-allocation.id |

## Move

`submit`: from draft to submitted, emitting LeaveAllocationSubmitted.

## Steps

- `leave-allocation.submit.load` (database)
- `leave-allocation.submit.update` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| AllocationOverlaps | 45 | LL-005 | declared in errors.ts |
| LeaveAllocationNotDraft | 40 | LL-900 | the leave-allocation is in a state submit can't start from; carries `state` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its leaveAllocation.company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### allocate leave

Starts from the world `a leave type`.

- **Olga can't submit it.** `olga` (signed in) calls and sends leaveAllocation the last call's leaveAllocation, and is refused with NotAllowed, AR-001.
- **Ada submits it.** `ada` (role company.owner) calls and sends leaveAllocation the last call's leaveAllocation, and gets back an answer matching `^lal_[0-9a-z]+$`.
- **it can't be submitted twice.** `ada` (role company.owner) calls and sends leaveAllocation the last call's leaveAllocation, and is refused with LeaveAllocationNotDraft, LL-900, carrying state `submitted`.
- **and submitted.** `ada` (role company.owner) calls and sends leaveAllocation the last call's leaveAllocation, and is answered.
- **and submitted, again.** `ada` (role company.owner) calls and sends leaveAllocation the last call's leaveAllocation, and is answered.
- **which is submitted too: another type doesn't overlap.** `ada` (role company.owner) calls and sends leaveAllocation the last call's leaveAllocation, and is answered.
- **she submits the March one.** `ada` (role company.owner) calls and sends leaveAllocation the last call's leaveAllocation, and is answered.
- **and submitted: 2028 is a leap year, so 29 February is the day before.** `ada` (role company.owner) calls and sends leaveAllocation the last call's leaveAllocation, and is answered.
- **it can't be submitted now: it shares days with the two submitted since.** `ada` (role company.owner) calls and sends leaveAllocation the last call's leaveAllocation, and is refused with AllocationOverlaps, LL-005.
- **and submits it.** `ada` (role company.owner) calls and sends leaveAllocation the last call's leaveAllocation, and is answered.

### leave balance

Starts from the world `a leave allocation`.

- **and submits it.** `ada` (role company.owner) calls and sends leaveAllocation the last call's leaveAllocation, and gets back an answer matching `^lal_[0-9a-z]+$`.
- **and submits it, again.** `ada` (role company.owner) calls and sends leaveAllocation the last call's leaveAllocation, and gets back an answer matching `^lal_[0-9a-z]+$`.

### leave days

Starts from the world `a leave allocation`.

- **and submits it.** `ada` (role company.owner) calls and sends leaveAllocation the last call's leaveAllocation, and gets back an answer matching `^lal_[0-9a-z]+$`.

### leave stays in its company

Starts from the world `a leave application`.

- **she can submit it, made before Olga left.** `ada` (role company.owner) calls and sends leaveAllocation the last call's leaveAllocation, and is answered.

### overlapping leave

Starts from the world `a leave application`.

- **and submits it.** `ada` (role company.owner) calls and sends leaveAllocation the last call's leaveAllocation, and gets back an answer matching `^lal_[0-9a-z]+$`.
- **and submits his.** `ada` (role company.owner) calls and sends leaveAllocation the last call's leaveAllocation, and gets back an answer matching `^lal_[0-9a-z]+$`.

## How to call

```sh
capxul leave-allocation submit --leaveAllocation <leaveAllocation>
```

HTTP: `POST /leave-allocation/submit` with the payload as JSON. SDK: `Sdk.leave-allocation.submit(payload)`.
