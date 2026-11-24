<!-- Generated from the blueprint. Do not edit. -->
# job-applicant.get

Read one job-applicant by its id: company, jobOpening, applicantName, email, state.

**Who may call:** the owner of its company.

**A read:** answered from the records, with no handler.

**Budget:** p95 50ms.

## Payload

| field | value |
|---|---|
| id | job-applicant.id |

## Answer

| field | value |
|---|---|
| company | job-applicant.company |
| jobOpening | job-applicant.jobOpening |
| applicantName | job-applicant.applicantName |
| email | job-applicant.email |
| state | text |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its company; the handler never runs |

## Worked examples

### hire from a job opening

Starts from the world `a technical round`.

- **Pat reads back accepted, for the opening.** `ada` (role company.owner) calls and sends id the last call's jobApplicant, and gets back [the world's company, `Pat Mwangi`, `pat@example.com`, `accepted`].

### make a job offer

Starts from the world `a second job title`.

- **Pat reads back accepted.** `ada` (role company.owner) calls and sends id the world's jobApplicant, and gets back [the world's company, the world's jobOpening, `Pat Mwangi`, `pat@example.com`, `accepted`].
- **Sam reads back rejected.** `ada` (role company.owner) calls and sends id the last call's jobApplicant, and gets back [the world's company, `Sam Otieno`, `sam@example.com`, `rejected`].

### open a job

Starts from the world `a job applicant`.

- **Sam reads back in Acme Trading, the opening's company.** `ada` (role company.owner) calls and sends id the last call's jobApplicant, and gets back [the world's company, `Sam Otieno`, `pat@example.com`, `open`].
- **Pat, who applied before it closed, is still open.** `ada` (role company.owner) calls and sends id the world's jobApplicant, and gets back [the world's company, the world's jobOpening, `Pat Mwangi`, `pat@example.com`, `open`].
- **Bo can't read Pat.** `bo` (signed in) calls and sends id the world's jobApplicant, and is refused with NotAllowed, AR-001.

## How to call

```sh
capxul job-applicant get --id <id>
```

HTTP: `POST /job-applicant/get` with the payload as JSON. SDK: `Sdk.job-applicant.get(payload)`.
