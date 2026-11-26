<!-- Generated from the blueprint. Do not edit. -->
# salary-component

A part of an employee's pay: an earning, such as basic pay, or a deduction, such as a pension contribution.

Lives in the database.

## Fields

| field | value | description |
|---|---|---|
| id | id |  |
| company | company.id |  |
| salaryComponent | ComponentName |  |
| type | ComponentType |  |
| amount | Amount | What a structure line pays when it names no amount of its own, in USDC base units. 0 for none. |
| account | account.id | The company's ledger its pay is booked to: debited for an earning, credited for a deduction. |

## Machine

States: active. A move from the wrong state is refused SalaryComponentNotActive (exit 40).

| move | from | to | emits |
|---|---|---|---|
| create | (creates) | active | SalaryComponentCreated |

## Invariants

- `salary-component.oneNamePerCompany`: another salary component holds this company and salary component. Unique on company, salaryComponent, in every state; refused SalaryComponentTaken.

## Events

- `SalaryComponentCreated`: carries salaryComponent (salary-component.id), company (salary-component.company), type (salary-component.type); emitted by the move create

## Operations

- [salary-component.create](create.md): Add a part of pay, an earning or a deduction, with its default amount and the ledger it is booked to.
- [salary-component.get](get.md): Read one salary-component by its id: company, salaryComponent, type, amount, account, state.
