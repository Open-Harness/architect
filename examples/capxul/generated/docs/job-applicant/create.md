<!-- Generated from the blueprint. Do not edit. -->
# job-applicant.create

Add a person who applied for a job opening.

**Who may call:** the owner of its jobOpening.company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| jobOpening | job-applicant.jobOpening |
| applicantName | job-applicant.applicantName |
| email | job-applicant.email |

## Answer

| field | value |
|---|---|
| jobApplicant | job-applicant.id |

## Move

`create`: from nothing (it creates) to open, emitting JobApplicantCreated.

## Steps

- `job-applicant.create.load` (database)
- `job-applicant.create.insert` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| OpeningClosed | 41 | JA-001 | declared in errors.ts |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its jobOpening.company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### hire from a job opening

Starts from the world `a technical round`.

- **Pat applies for it.** `ada` (role company.owner) calls and sends jobOpening the last call's jobOpening, applicantName `Pat Mwangi`, email `pat@example.com`, and gets back an answer matching `^jap_[0-9a-z]+$`.

### make a job offer

Starts from the world `a second job title`.

- **Sam applies for the same job.** `ada` (role company.owner) calls and sends jobOpening the world's jobOpening, applicantName `Sam Otieno`, email `sam@example.com`, and gets back an answer matching `^jap_[0-9a-z]+$`.

### open a job

Starts from the world `a job applicant`.

- **nor add an applicant to it.** `bo` (signed in) calls and sends jobOpening the last call's jobOpening, applicantName `Lee Wanjiru`, email `lee@example.com`, and is refused with NotAllowed, AR-001.
- **Sam applies for it, with the same email as Pat's: an email may apply again.** `ada` (role company.owner) calls and sends jobOpening the last call's jobOpening, applicantName `Sam Otieno`, email `pat@example.com`, and gets back an answer matching `^jap_[0-9a-z]+$`.
- **Pat applies for the engineering job again, with the same email.** `ada` (role company.owner) calls and sends jobOpening the world's jobOpening, applicantName `Pat Mwangi`, email `pat@example.com`, and gets back an answer matching `^jap_[0-9a-z]+$`.
- **nobody new may apply for it.** `ada` (role company.owner) calls and sends jobOpening the world's jobOpening, applicantName `Lee Wanjiru`, email `lee@example.com`, and is refused with OpeningClosed, JA-001.

### schedule an interview

Starts from the world `an outside employee`.

- **Lee applies for the same job.** `ada` (role company.owner) calls and sends jobOpening the world's jobOpening, applicantName `Lee Wanjiru`, email `lee@example.com`, and gets back an answer matching `^jap_[0-9a-z]+$`.
- **Sam applies for the same job.** `ada` (role company.owner) calls and sends jobOpening the world's jobOpening, applicantName `Sam Otieno`, email `sam@example.com`, and gets back an answer matching `^jap_[0-9a-z]+$`.

## How to call

```sh
capxul job-applicant create --jobOpening <jobOpening> --applicantName <applicantName> --email <email>
```

HTTP: `POST /job-applicant/create` with the payload as JSON. SDK: `Sdk.job-applicant.create(payload)`.
