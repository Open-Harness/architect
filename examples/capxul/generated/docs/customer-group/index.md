<!-- Generated from the blueprint. Do not edit. -->
# customer-group

A heading customers are grouped under in a company, kept as a tree with one root.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| company | company.id |
| customerGroupName | Name |
| parentCustomerGroup (optional) | customer-group.id |

## Machine

States: group, ledger. A move from the wrong state is refused CustomerGroupNotGroup (exit 40).

| move | from | to | emits |
|---|---|---|---|
| create | (creates) | group, ledger | CustomerGroupCreated |

## Invariants

- `customer-group.oneNamePerCompany`: another customer group holds this company and customer group name. Unique on company, customerGroupName, in every state; refused CustomerGroupNameTaken.

## Events

- `CustomerGroupCreated`: carries customerGroup (customer-group.id), company (customer-group.company); emitted by the move create

## Operations

- [customer-group.create](create.md): Add a customer group to a company, under a group or as its one root.
- [customer-group.get](get.md): Read one customer-group by its id: company, customerGroupName, parentCustomerGroup, state.
