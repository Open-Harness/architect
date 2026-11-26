<!-- Generated from the blueprint. Do not edit. -->
# supplier-group

A heading suppliers are grouped under in a company, kept as a tree with one root.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| company | company.id |
| supplierGroupName | Name |
| parentSupplierGroup (optional) | supplier-group.id |

## Machine

States: group, ledger. A move from the wrong state is refused SupplierGroupNotGroup (exit 40).

| move | from | to | emits |
|---|---|---|---|
| create | (creates) | group, ledger | SupplierGroupCreated |

## Invariants

- `supplier-group.oneNamePerCompany`: another supplier group holds this company and supplier group name. Unique on company, supplierGroupName, in every state; refused SupplierGroupNameTaken.

## Events

- `SupplierGroupCreated`: carries supplierGroup (supplier-group.id), company (supplier-group.company); emitted by the move create

## Operations

- [supplier-group.create](create.md): Add a supplier group to a company, under a group or as its one root.
- [supplier-group.get](get.md): Read one supplier-group by its id: company, supplierGroupName, parentSupplierGroup, state.
