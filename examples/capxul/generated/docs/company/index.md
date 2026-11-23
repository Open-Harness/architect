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

- `company.oneAbbrPerOwner`: another company holds this owner and abbr. Unique on owner, abbr, in every state; refused CompanyAbbrTaken.
- `company.oneNamePerOwner`: another company holds this owner and company name. Unique on owner, companyName, in every state; refused CompanyNameTaken.

## Events

- `CompanyCreated`: carries company (company.id), owner (company.owner: The person who set the company up, and runs it.); emitted by the move create

## Roles

- owner

## Operations

- [company.create](create.md): Set up a company; the person who sets it up runs it.
- [company.get](get.md): Read one company by its id: companyName, abbr, country, defaultCurrency, owner, state.
