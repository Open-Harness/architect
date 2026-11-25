<!-- Generated from the blueprint. Do not edit. -->
# fiscal-year

A company's accounting year: the days its books are kept for.

Lives in the database.

## Fields

| field | value | description |
|---|---|---|
| id | id |  |
| company | company.id |  |
| year | YearName |  |
| yearStartDate | Day |  |
| yearEndDate | Day |  |
| isShortYear | schema | A year shorter than twelve months, as some countries allow (ERPNext's `is_short_year`). |

## Machine

States: active. A move from the wrong state is refused FiscalYearNotActive (exit 40).

| move | from | to | emits |
|---|---|---|---|
| create | (creates) | active | FiscalYearCreated |

## Invariants

- `fiscal-year.oneNamePerCompany`: another fiscal year holds this company and year. Unique on company, year, in every state; refused FiscalYearNameTaken.

## Events

- `FiscalYearCreated`: carries fiscalYear (fiscal-year.id), company (fiscal-year.company), yearStartDate (fiscal-year.yearStartDate), yearEndDate (fiscal-year.yearEndDate); emitted by the move create

## Operations

- [fiscal-year.create](create.md): Set up a company's fiscal year.
- [fiscal-year.get](get.md): Read one fiscal-year by its id: company, year, yearStartDate, yearEndDate, isShortYear, state.
