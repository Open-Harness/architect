<!-- Generated from the blueprint. Do not edit. -->
# job-offer.create

Offer an applicant a job, under one of the company's job titles.

**Who may call:** the owner of its jobApplicant.company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| jobApplicant | job-offer.jobApplicant |
| designation | job-offer.designation |
| offerDate | job-offer.offerDate |

## Answer

| field | value |
|---|---|
| jobOffer | job-offer.id |

## Move

`create`: from nothing (it creates) to awaiting, emitting JobOfferMade.

## Steps

- `job-offer.create.load` (database)
- `job-offer.create.insert` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| OfferDesignationNotInCompany | 41 | JF-001 | declared in errors.ts |
| OfferAlreadyMade | 42 | JF-002 | another job offer holds this job applicant; by the rule job-offer.oneOfferPerApplicant |
| DesignationNotFound | 4 | DS-901 | nothing has the id in designation; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its jobApplicant.company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### hire from a job opening

Starts from the world `a technical round`.

- **Ada offers its applicant the job of engineer.** `ada` (role company.owner) calls and sends jobApplicant the last call's jobApplicant, designation the world's designation, offerDate `2026-12-01`, and gets back an answer matching `^jof_[0-9a-z]+$`.

### make a job offer

Starts from the world `a second job title`.

- **Bo can't offer Pat a job.** `bo` (signed in) calls and sends jobApplicant the world's jobApplicant, designation the world's designation, offerDate `2026-12-01`, and is refused with NotAllowed, AR-001.
- **nor can Olga.** `olga` (signed in) calls and sends jobApplicant the world's jobApplicant, designation the world's designation, offerDate `2026-12-01`, and is refused with NotAllowed, AR-001.
- **she can't offer it to Pat, who applied to Acme Trading, though she runs both.** `ada` (role company.owner) calls and sends jobApplicant the world's jobApplicant, designation the last call's designation, offerDate `2026-12-01`, and is refused with OfferDesignationNotInCompany, JF-001.
- **Ada offers Pat the job of engineer.** `ada` (role company.owner) calls and sends jobApplicant the world's jobApplicant, designation the world's designation, offerDate `2026-12-01`, and gets back an answer matching `^jof_[0-9a-z]+$`.
- **Ada can't make Pat a second offer while the first awaits.** `ada` (role company.owner) calls and sends jobApplicant the world's jobApplicant, designation the world's designation, offerDate `2026-12-02`, and is refused with OfferAlreadyMade, JF-002.
- **Ada can't make Pat another offer now one is accepted.** `ada` (role company.owner) calls and sends jobApplicant the world's jobApplicant, designation the world's designation, offerDate `2026-12-04`, and is refused with OfferAlreadyMade, JF-002.
- **and offers Sam Lead Engineer, another of Acme Trading's job titles.** `ada` (role company.owner) calls and sends jobApplicant the last call's jobApplicant, designation the world's otherDesignation, offerDate `2026-12-02`, and gets back an answer matching `^jof_[0-9a-z]+$`.
- **nor make Sam a second offer: HRMS keeps one per applicant, rejected or not.** `ada` (role company.owner) calls and sends jobApplicant the last call's jobApplicant, designation the world's designation, offerDate `2026-12-03`, and is refused with OfferAlreadyMade, JF-002.

### open a job

Starts from the world `a job applicant`.

- **Ada offers Pat the job of engineer, after the opening closed.** `ada` (role company.owner) calls and sends jobApplicant the world's jobApplicant, designation the world's designation, offerDate `2026-12-01`, and gets back an answer matching `^jof_[0-9a-z]+$`.

## How to call

```sh
capxul job-offer create --jobApplicant <jobApplicant> --designation <designation> --offerDate <offerDate>
```

HTTP: `POST /job-offer/create` with the payload as JSON. SDK: `Sdk.job-offer.create(payload)`.
