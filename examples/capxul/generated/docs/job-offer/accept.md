<!-- Generated from the blueprint. Do not edit. -->
# job-offer.accept

Record that the applicant accepted the offer.

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

`accept`: from awaiting to accepted, emitting JobOfferAccepted.

## Steps

- `job-offer.accept.update` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| OfferAlreadyMade | 42 | JF-002 | another job offer holds this job applicant; by the rule job-offer.oneOfferPerApplicant |
| JobOfferNotAwaiting | 40 | JF-900 | the job-offer is in a state accept can't start from; carries `state` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its jobOffer.company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### hire from a job opening

Starts from the world `a technical round`.

- **Pat accepts the offer.** `ada` (role company.owner) calls and sends jobOffer the last call's jobOffer, and gets back [true, true].

### make a job offer

Starts from the world `an outside employee`.

- **Bo can't record Pat's answer.** `bo` (signed in) calls and sends jobOffer the last call's jobOffer, and is refused with NotAllowed, AR-001.
- **Pat accepts the offer.** `ada` (role company.owner) calls and sends jobOffer the last call's jobOffer, and gets back [the last call's jobOffer, the world's jobApplicant].
- **nor accepted again.** `ada` (role company.owner) calls and sends jobOffer the last call's jobOffer, and is refused with JobOfferNotAwaiting, JF-900, carrying state `accepted`.
- **it can't then be accepted.** `ada` (role company.owner) calls and sends jobOffer the last call's jobOffer, and is refused with JobOfferNotAwaiting, JF-900, carrying state `rejected`.

## How to call

```sh
capxul job-offer accept --jobOffer <jobOffer>
```

HTTP: `POST /job-offer/accept` with the payload as JSON. SDK: `Sdk.job-offer.accept(payload)`.
