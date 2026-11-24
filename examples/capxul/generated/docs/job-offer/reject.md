<!-- Generated from the blueprint. Do not edit. -->
# job-offer.reject

Record that the applicant rejected the offer.

**Who may call:** the owner of its jobOffer.company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| jobOffer | job-offer.id |

## Answer

| field | value |
|---|---|
| jobOffer | job-offer.id |
| jobApplicant | job-offer.jobApplicant |

## Move

`reject`: from awaiting to rejected, emitting JobOfferRejected.

## Steps

- `job-offer.reject.update` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| OfferAlreadyMade | 42 | JF-002 | another job offer holds this job applicant; by the rule job-offer.oneOfferPerApplicant |
| JobOfferNotAwaiting | 40 | JF-900 | the job-offer is in a state reject can't start from; carries `state` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its jobOffer.company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### make a job offer

Starts from the world `a second job title`.

- **it can't then be rejected.** `ada` (role company.owner) calls and sends jobOffer the last call's jobOffer, and is refused with JobOfferNotAwaiting, JF-900, carrying state `accepted`.
- **Bo can't record Sam's answer.** `bo` (signed in) calls and sends jobOffer the last call's jobOffer, and is refused with NotAllowed, AR-001.
- **Sam rejects the offer, which names Sam.** `ada` (role company.owner) calls and sends jobOffer the last call's jobOffer, and gets back [true, true].

## How to call

```sh
capxul job-offer reject --jobOffer <jobOffer>
```

HTTP: `POST /job-offer/reject` with the payload as JSON. SDK: `Sdk.job-offer.reject(payload)`.
