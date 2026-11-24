<!-- Generated from the blueprint. Do not edit. -->
# interview.reject

Mark an interview rejected.

**Who may call:** the owner of its interview.company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| interview | interview.id |

## Answer

| field | value |
|---|---|
| interview | interview.id |

## Move

`reject`: from pending to rejected, emitting InterviewRejected.

## Steps

- `interview.reject.update` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| InterviewAlreadyScheduled | 46 | IV-006 | another interview holds this job applicant and interview round; by the rule interview.oneInterviewPerRound |
| InterviewNotPending | 40 | IV-900 | the interview is in a state reject can't start from; carries `state` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its interview.company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### give interview feedback

Starts from the world `an interview`.

- **Ada marks the technical interview rejected, though Olga cleared Pat.** `ada` (role company.owner) calls and sends interview the world's interview, and gets back the world's interview.

### schedule an interview

Starts from the world `an outside employee`.

- **Bo can't reject it.** `bo` (signed in) calls and sends interview the last call's interview, and is refused with NotAllowed, AR-001.
- **Ada marks it rejected.** `ada` (role company.owner) calls and sends interview the last call's interview, and gets back an answer matching `^ivw_[0-9a-z]+$`.
- **nor rejected again.** `ada` (role company.owner) calls and sends interview the last call's interview, and is refused with InterviewNotPending, IV-900, carrying state `rejected`.
- **it can't then be rejected.** `ada` (role company.owner) calls and sends interview the last call's interview, and is refused with InterviewNotPending, IV-900, carrying state `cleared`.

## How to call

```sh
capxul interview reject --interview <interview>
```

HTTP: `POST /interview/reject` with the payload as JSON. SDK: `Sdk.interview.reject(payload)`.
