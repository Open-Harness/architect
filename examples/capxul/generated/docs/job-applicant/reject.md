<!-- Generated from the blueprint. Do not edit. -->
# job-applicant.reject

Turn an applicant down.

**Who may call:** the owner of its jobApplicant.company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| jobApplicant | job-applicant.id |

## Answer

| field | value |
|---|---|
| jobApplicant | job-applicant.id |

## Move

`reject`: from open or hold to rejected, emitting JobApplicantRejected.

## Steps

- `job-applicant.reject.update` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| JobApplicantNotOpen | 40 | JA-900 | the job-applicant is in a state reject can't start from; carries `state` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its jobApplicant.company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### make a job offer

Starts from the world `a second job title`.

- **an accepted applicant can't be turned down.** `ada` (role company.owner) calls and sends jobApplicant the world's jobApplicant, and is refused with JobApplicantNotOpen, JA-900, carrying state `accepted`.
- **Bo can't turn Sam down.** `bo` (signed in) calls and sends jobApplicant the last call's jobApplicant, and is refused with NotAllowed, AR-001.
- **Ada turns Sam down, from hold.** `ada` (role company.owner) calls and sends jobApplicant the last call's jobApplicant, and gets back an answer matching `^jap_[0-9a-z]+$`.
- **nor turned down again.** `ada` (role company.owner) calls and sends jobApplicant the last call's jobApplicant, and is refused with JobApplicantNotOpen, JA-900, carrying state `rejected`.

### schedule an interview

Starts from the world `an outside employee`.

- **and Ada turns Sam down at once.** `ada` (role company.owner) calls and sends jobApplicant the last call's jobApplicant, and gets back an answer matching `^jap_[0-9a-z]+$`.
- **Ada turns Pat down.** `ada` (role company.owner) calls and sends jobApplicant the world's jobApplicant, and gets back the world's jobApplicant.

## How to call

```sh
capxul job-applicant reject --jobApplicant <jobApplicant>
```

HTTP: `POST /job-applicant/reject` with the payload as JSON. SDK: `Sdk.job-applicant.reject(payload)`.
