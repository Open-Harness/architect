<!-- Generated from the blueprint. Do not edit. -->
# cost-center

Where in a company money is spent or earned, kept as a tree of groups and ledgers.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| company | company.id |
| costCenterName | Name |
| parentCostCenter (optional) | cost-center.id |

## Machine

States: group, ledger. A move from the wrong state is refused CostCenterNotGroup (exit 40).

| move | from | to | emits |
|---|---|---|---|
| create | (creates) | group, ledger | CostCenterCreated |

## Invariants

- `cost-center.oneNamePerCompany`: another cost center holds this company and cost center name. Unique on company, costCenterName, in every state; refused CostCenterNameTaken.

## Events

- `CostCenterCreated`: carries costCenter (cost-center.id), company (cost-center.company); emitted by the move create

## Operations

- [cost-center.create](create.md): Add a cost center to a company, under a group or as a root.
- [cost-center.get](get.md): Read one cost-center by its id: company, costCenterName, parentCostCenter, state.
