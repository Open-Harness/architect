<!-- Generated from the blueprint. Do not edit. -->
# job-applicant.accept

Mark an applicant accepted, once they have accepted their job offer.

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

`accept`: from open or hold to accepted, emitting JobApplicantAccepted.

## Steps

- `job-applicant.accept.load` (database)
- `job-applicant.accept.update` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| OfferNotAccepted | 42 | JA-002 | declared in errors.ts |
| JobApplicantNotOpen | 40 | JA-900 | the job-applicant is in a state accept can't start from; carries `state` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its jobApplicant.company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### hire from a job opening

Starts from the world `a technical round`.

- **Ada accepts Pat, the offer's applicant.** `ada` (role company.owner) calls and sends jobApplicant the last call's jobApplicant, and gets back an answer matching `^jap_[0-9a-z]+$`.

### make a job offer

Starts from the world `an outside employee`.

- **Ada can't accept Pat before any offer.** `ada` (role company.owner) calls and sends jobApplicant the world's jobApplicant, and is refused with OfferNotAccepted, JA-002.
- **nor accept Pat while the offer awaits.** `ada` (role company.owner) calls and sends jobApplicant the world's jobApplicant, and is refused with OfferNotAccepted, JA-002.
- **Bo can't accept Pat.** `bo` (signed in) calls and sends jobApplicant the world's jobApplicant, and is refused with NotAllowed, AR-001.
- **Ada accepts Pat, whose offer is accepted.** `ada` (role company.owner) calls and sends jobApplicant the world's jobApplicant, and gets back the world's jobApplicant.
- **Ada can't accept Sam on Pat's accepted offer.** `ada` (role company.owner) calls and sends jobApplicant the last call's jobApplicant, and is refused with OfferNotAccepted, JA-002.
- **Ada can't accept Sam on a rejected offer.** `ada` (role company.owner) calls and sends jobApplicant the last call's jobApplicant, and is refused with OfferNotAccepted, JA-002.
- **a rejected applicant can't be accepted.** `ada` (role company.owner) calls and sends jobApplicant the last call's jobApplicant, and is refused with JobApplicantNotOpen, JA-900, carrying state `rejected`.

## How to call

```sh
capxul job-applicant accept --jobApplicant <jobApplicant>
```

HTTP: `POST /job-applicant/accept` with the payload as JSON. SDK: `Sdk.job-applicant.accept(payload)`.
