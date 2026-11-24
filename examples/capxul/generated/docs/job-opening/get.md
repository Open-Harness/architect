<!-- Generated from the blueprint. Do not edit. -->
# job-opening.get

Read one job-opening by its id: company, designation, jobTitle, vacancies, state.

**Who may call:** the owner of its company.

**A read:** answered from the records, with no handler.

**Budget:** p95 50ms.

## Payload

| field | value |
|---|---|
| id | job-opening.id |

## Answer

| field | value |
|---|---|
| company | job-opening.company |
| designation | job-opening.designation |
| jobTitle | job-opening.jobTitle |
| vacancies | job-opening.vacancies |
| state | text |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its company; the handler never runs |

## Worked examples

### hire from a job opening

Starts from the world `a technical round`.

- **it reads back closed.** `ada` (role company.owner) calls and sends id the last call's jobOpening, and gets back [the world's company, the world's designation, `Backend Engineer`, `1`, `closed`].

### open a job

Starts from the world `a job applicant`.

- **Bo can't read it.** `bo` (signed in) calls and sends id the last call's jobOpening, and is refused with NotAllowed, AR-001.
- **the opening Sam applied for reads back in Acme Trading, the job title's company, as Ada typed it.** `ada` (role company.owner) calls and sends id the last call's jobOpening, and gets back [the world's company, the world's designation, `data analyst`, `1`, `open`].
- **the engineering job reads back for two.** `ada` (role company.owner) calls and sends id the world's jobOpening, and gets back [`Backend Engineer`, `2`, `open`].
- **it reads back closed.** `ada` (role company.owner) calls and sends id the world's jobOpening, and gets back [the world's company, `Backend Engineer`, `2`, `closed`].

## How to call

```sh
capxul job-opening get --id <id>
```

HTTP: `POST /job-opening/get` with the payload as JSON. SDK: `Sdk.job-opening.get(payload)`.
