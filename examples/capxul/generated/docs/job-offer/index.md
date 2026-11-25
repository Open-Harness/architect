<!-- Generated from the blueprint. Do not edit. -->
# job-offer

A job offered to an applicant, under one of the company's job titles.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| company | company.id |
| jobApplicant | job-applicant.id |
| designation | designation.id |
| offerDate | Day |

## Machine

States: awaiting, accepted, rejected. A move from the wrong state is refused JobOfferNotAwaiting (exit 40).

| move | from | to | emits |
|---|---|---|---|
| create | (creates) | awaiting | JobOfferMade |
| accept | awaiting | accepted | JobOfferAccepted |
| reject | awaiting | rejected | JobOfferRejected |

## Invariants

- `job-offer.oneOfferPerApplicant`: another job offer holds this job applicant. Unique on jobApplicant, in every state; refused OfferAlreadyMade.

## Events

- `JobOfferAccepted`: carries jobOffer (job-offer.id), jobApplicant (job-offer.jobApplicant); emitted by the move accept
- `JobOfferMade`: carries jobOffer (job-offer.id), jobApplicant (job-offer.jobApplicant); emitted by the move create
- `JobOfferRejected`: carries jobOffer (job-offer.id), jobApplicant (job-offer.jobApplicant); emitted by the move reject

## Operations

- [job-offer.accept](accept.md): Record that the applicant accepted the offer.
- [job-offer.create](create.md): Offer an applicant a job, under one of the company's job titles.
- [job-offer.get](get.md): Read one job-offer by its id: company, jobApplicant, designation, offerDate, state.
- [job-offer.reject](reject.md): Record that the applicant rejected the offer.
