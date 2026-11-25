<!-- Generated from the blueprint. Do not edit. -->
# attendance-request.reject

Reject a request, marking none of its days.

**Who may call:** the owner of its attendanceRequest.company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| attendanceRequest | attendance-request.id |

## Answer

| field | value |
|---|---|
| attendanceRequest | attendance-request.id |

## Move

`reject`: from draft to rejected, emitting AttendanceRequestRejected.

## Steps

- `attendance-request.reject.update` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| AttendanceRequestNotDraft | 40 | AQ-900 | the attendance-request is in a state reject can't start from; carries `state` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its attendanceRequest.company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### approve an attendance request

Starts from the world `an attendance request`.

- **nor rejected once approved.** `ada` (role company.owner) calls and sends attendanceRequest the world's attendanceRequest, and is refused with AttendanceRequestNotDraft, AQ-900, carrying state `approved`.

### attendance requests and leave

Starts from the world `a leave application`.

- **Ada rejects it.** `ada` (role company.owner) calls and sends attendanceRequest the last call's attendanceRequest, and is answered.

### reject an attendance request

Starts from the world `an attendance request`.

- **Olga can't reject her own request.** `olga` (signed in) calls and sends attendanceRequest the world's attendanceRequest, and is refused with NotAllowed, AR-001.
- **nor can Bo.** `bo` (signed in) calls and sends attendanceRequest the world's attendanceRequest, and is refused with NotAllowed, AR-001.
- **Ada rejects it.** `ada` (role company.owner) calls and sends attendanceRequest the world's attendanceRequest, and gets back the world's attendanceRequest.
- **nor rejected again.** `ada` (role company.owner) calls and sends attendanceRequest the world's attendanceRequest, and is refused with AttendanceRequestNotDraft, AQ-900, carrying state `rejected`.

## How to call

```sh
capxul attendance-request reject --attendanceRequest <attendanceRequest>
```

HTTP: `POST /attendance-request/reject` with the payload as JSON. SDK: `Sdk.attendance-request.reject(payload)`.
