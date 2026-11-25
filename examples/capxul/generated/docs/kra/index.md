<!-- Generated from the blueprint. Do not edit. -->
# kra

A key result area a company appraises its people on.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| company | company.id |
| title | KraTitle |

## Machine

States: active. A move from the wrong state is refused KraNotActive (exit 40).

| move | from | to | emits |
|---|---|---|---|
| create | (creates) | active | KraCreated |

## Invariants

- `kra.oneTitlePerCompany`: another kra holds this company and title. Unique on company, title, in every state; refused KraTitleTaken.

## Events

- `KraCreated`: carries kra (kra.id), company (kra.company); emitted by the move create

## Operations

- [kra.create](create.md): Add a key result area to a company.
- [kra.get](get.md): Read one kra by its id: company, title, state.
