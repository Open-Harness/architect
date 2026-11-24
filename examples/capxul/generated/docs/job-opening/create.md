<!-- Generated from the blueprint. Do not edit. -->
# job-opening.create

Open a job under one of a company's job titles, for some number of people.

**Who may call:** the owner of its designation.company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| designation | job-opening.designation |
| jobTitle | job-opening.jobTitle |
| vacancies | job-opening.vacancies |

## Answer

| field | value |
|---|---|
| jobOpening | job-opening.id |

## Move

`create`: from nothing (it creates) to open, emitting JobOpeningCreated.

## Steps

- `job-opening.create.load` (database)
- `job-opening.create.insert` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| OpeningWithoutVacancies | 41 | JO-001 | declared in errors.ts |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its designation.company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### hire from a job opening

Starts from the world `a technical round`.

- **Ada opens Backend Engineer for one person.** `ada` (role company.owner) calls and sends designation the world's designation, jobTitle `Backend Engineer`, vacancies `1`, and gets back an answer matching `^jop_[0-9a-z]+$`.

### open a job

Starts from the world `a job applicant`.

- **Bo can't open a job under Ada's job title.** `bo` (signed in) calls and sends designation the world's designation, jobTitle `Data Analyst`, vacancies `1`, and is refused with NotAllowed, AR-001.
- **nor can Olga, who works there.** `olga` (signed in) calls and sends designation the world's designation, jobTitle `Data Analyst`, vacancies `1`, and is refused with NotAllowed, AR-001.
- **Ada can't open a job for nobody.** `ada` (role company.owner) calls and sends designation the world's designation, jobTitle `Data Analyst`, vacancies `0`, and is refused with OpeningWithoutVacancies, JO-001.
- **Ada opens data analyst, in lower case, for one person.** `ada` (role company.owner) calls and sends designation the world's designation, jobTitle `data analyst`, vacancies `1`, and gets back an answer matching `^jop_[0-9a-z]+$`.

## How to call

```sh
capxul job-opening create --designation <designation> --jobTitle <jobTitle> --vacancies <vacancies>
```

HTTP: `POST /job-opening/create` with the payload as JSON. SDK: `Sdk.job-opening.create(payload)`.
