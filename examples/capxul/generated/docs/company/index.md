<!-- Generated from the blueprint. Do not edit. -->
# company

A business that keeps its books, people and payroll in Capxul.

Lives in the database.

## Fields

| field | value | description |
|---|---|---|
| id | id |  |
| companyName | Name |  |
| abbr | Abbr |  |
| country | Country |  |
| defaultCurrency | CurrencyCode |  |
| owner | id | The person who set the company up, and runs it. |

## Machine

States: active. A move from the wrong state is refused CompanyNotActive (exit 40).

| move | from | to | emits |
|---|---|---|---|
| create | (creates) | active | CompanyCreated |

## Invariants

- `company.oneAbbr`: another company holds this abbr. Unique on abbr, in every state; refuses nothing, a break is a defect.
- `company.oneName`: another company holds this company name. Unique on companyName, in every state; refuses nothing, a break is a defect.

## Events

- `CompanyCreated`: carries company (company.id), owner (company.owner: The person who set the company up, and runs it.); emitted by the move create

## Roles

- owner

## Operations

- [company.create](create.md): Set up a company; the person who sets it up runs it.
- [company.get](get.md): Read one company by its id: companyName, abbr, country, defaultCurrency, owner, state.
