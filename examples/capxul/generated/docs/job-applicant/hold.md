<!-- Generated from the blueprint. Do not edit. -->
# job-applicant.hold

Put an applicant on hold.

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

`hold`: from open to hold, emitting JobApplicantHeld.

## Steps

- `job-applicant.hold.update` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| JobApplicantNotOpen | 40 | JA-900 | the job-applicant is in a state hold can't start from; carries `state` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its jobApplicant.company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### make a job offer

Starts from the world `a second job title`.

- **Bo can't put Pat on hold.** `bo` (signed in) calls and sends jobApplicant the world's jobApplicant, and is refused with NotAllowed, AR-001.
- **Ada puts Pat on hold while she decides.** `ada` (role company.owner) calls and sends jobApplicant the world's jobApplicant, and gets back the world's jobApplicant.
- **nor put on hold.** `ada` (role company.owner) calls and sends jobApplicant the world's jobApplicant, and is refused with JobApplicantNotOpen, JA-900, carrying state `accepted`.
- **Ada puts Sam on hold.** `ada` (role company.owner) calls and sends jobApplicant the last call's jobApplicant, and gets back an answer matching `^jap_[0-9a-z]+$`.

### schedule an interview

Starts from the world `an outside employee`.

- **Ada puts Lee on hold.** `ada` (role company.owner) calls and sends jobApplicant the last call's jobApplicant, and gets back an answer matching `^jap_[0-9a-z]+$`.

## How to call

```sh
capxul job-applicant hold --jobApplicant <jobApplicant>
```

HTTP: `POST /job-applicant/hold` with the payload as JSON. SDK: `Sdk.job-applicant.hold(payload)`.
