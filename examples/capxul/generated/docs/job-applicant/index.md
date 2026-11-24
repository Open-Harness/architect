<!-- Generated from the blueprint. Do not edit. -->
# job-applicant

A person who applied for a job opening.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| company | company.id |
| jobOpening | job-opening.id |
| applicantName | Name |
| email | ApplicantEmail |

## Machine

States: open, hold, rejected, accepted. A move from the wrong state is refused JobApplicantNotOpen (exit 40).

| move | from | to | emits |
|---|---|---|---|
| create | (creates) | open | JobApplicantCreated |
| hold | open | hold | JobApplicantHeld |
| reject | open, hold | rejected | JobApplicantRejected |
| accept | open, hold | accepted | JobApplicantAccepted |

## Events

- `JobApplicantAccepted`: carries jobApplicant (job-applicant.id); emitted by the move accept
- `JobApplicantCreated`: carries jobApplicant (job-applicant.id), company (job-applicant.company), jobOpening (job-applicant.jobOpening); emitted by the move create
- `JobApplicantHeld`: carries jobApplicant (job-applicant.id); emitted by the move hold
- `JobApplicantRejected`: carries jobApplicant (job-applicant.id); emitted by the move reject

## Operations

- [job-applicant.accept](accept.md): Mark an applicant accepted, once they have accepted their job offer.
- [job-applicant.create](create.md): Add a person who applied for a job opening.
- [job-applicant.get](get.md): Read one job-applicant by its id: company, jobOpening, applicantName, email, state.
- [job-applicant.hold](hold.md): Put an applicant on hold.
- [job-applicant.reject](reject.md): Turn an applicant down.
