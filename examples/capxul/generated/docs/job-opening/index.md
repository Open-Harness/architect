<!-- Generated from the blueprint. Do not edit. -->
# job-opening

A job a company is hiring for, and how many people it hires.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| company | company.id |
| designation | designation.id |
| jobTitle | Name |
| vacancies | Vacancies |

## Machine

States: open, closed. A move from the wrong state is refused JobOpeningNotOpen (exit 40).

| move | from | to | emits |
|---|---|---|---|
| create | (creates) | open | JobOpeningCreated |
| close | open | closed | JobOpeningClosed |

## Events

- `JobOpeningClosed`: carries jobOpening (job-opening.id); emitted by the move close
- `JobOpeningCreated`: carries jobOpening (job-opening.id), company (job-opening.company), vacancies (job-opening.vacancies); emitted by the move create

## Operations

- [job-opening.close](close.md): Close a job opening to new applicants.
- [job-opening.create](create.md): Open a job under one of a company's job titles, for some number of people.
- [job-opening.get](get.md): Read one job-opening by its id: company, designation, jobTitle, vacancies, state.
