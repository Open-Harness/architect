<!-- Generated from the blueprint. Do not edit. -->
# leave-application.reject

Reject a leave, marking none of its days.

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

`reject`: from open to rejected, emitting LeaveApplicationRejected.

## Steps

- `leave-application.reject.update` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| LeaveApplicationNotOpen | 40 | LP-900 | the leave-application is in a state reject can't start from; carries `state` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its leaveApplication.company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### overlapping leave

Starts from the world `a leave application`.

- **Ada rejects them.** `ada` (role company.owner) calls and sends leaveApplication the last call's leaveApplication, and is answered.

### take leave

Starts from the world `a leave allocation`.

- **nor can Olga reject it.** `olga` (signed in) calls and sends leaveApplication the last call's leaveApplication, and is refused with NotAllowed, AR-001.
- **nor rejected once approved.** `ada` (role company.owner) calls and sends leaveApplication the last call's leaveApplication, and is refused with LeaveApplicationNotOpen, LP-900, carrying state `approved`.
- **Ada rejects it: no day is marked.** `ada` (role company.owner) calls and sends leaveApplication the last call's leaveApplication, and gets back an answer matching `^lap_[0-9a-z]+$`.

## How to call

```sh
capxul leave-application reject --leaveApplication <leaveApplication>
```

HTTP: `POST /leave-application/reject` with the payload as JSON. SDK: `Sdk.leave-application.reject(payload)`.
