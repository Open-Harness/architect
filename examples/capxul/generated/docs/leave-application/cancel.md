<!-- Generated from the blueprint. Do not edit. -->
# leave-application.cancel

Cancel a leave, open or approved.

**Who may call:** the owner of its leaveApplication.company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| leaveApplication | leave-application.id |

## Answer

| field | value |
|---|---|
| leaveApplication | leave-application.id |

## Move

`cancel`: from open or approved to cancelled, emitting LeaveApplicationCancelled.

## Steps

- `leave-application.cancel.update` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| LeaveApplicationNotOpen | 40 | LP-900 | the leave-application is in a state cancel can't start from; carries `state` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its leaveApplication.company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### leave balance

Starts from the world `a leave allocation`.

- **and cancels it, approved: its 5 days are given back.** `ada` (role company.owner) calls and sends leaveApplication the last call's leaveApplication, and is answered.

### overlapping leave

Starts from the world `a leave application`.

- **Ada cancels it.** `ada` (role company.owner) calls and sends leaveApplication the world's leaveApplication, and is answered.

### take leave

Starts from the world `a leave allocation`.

- **nor can Olga reject or cancel it.** `olga` (signed in) calls and sends leaveApplication the last call's leaveApplication, and is refused with NotAllowed, AR-001.
- **nor cancelled.** `ada` (role company.owner) calls and sends leaveApplication the last call's leaveApplication, and is refused with LeaveApplicationNotOpen, LP-900, carrying state `rejected`.
- **Ada cancels it while open.** `ada` (role company.owner) calls and sends leaveApplication the last call's leaveApplication, and is answered.

## How to call

```sh
capxul leave-application cancel --leaveApplication <leaveApplication>
```

HTTP: `POST /leave-application/cancel` with the payload as JSON. SDK: `Sdk.leave-application.cancel(payload)`.
