<!-- Generated from the blueprint. Do not edit. -->
# supplier-group.create

Add a supplier group to a company, under a group or as its one root.

**Who may call:** the owner of its company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

| field | value | description |
|---|---|---|
| company | supplier-group.company |  |
| supplierGroupName | supplier-group.supplierGroupName |  |
| parentSupplierGroup (optional) | supplier-group.parentSupplierGroup |  |
| isGroup | YesNo | Make it a group, which other supplier groups sit under, rather than a ledger, which suppliers are put in. |

## Answer

| field | value |
|---|---|
| supplierGroup | supplier-group.id |

## Move

`create`: from nothing (it creates) to group or ledger, emitting SupplierGroupCreated.

## Steps

- `supplier-group.create.load` (database)
- `supplier-group.create.insert` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| ParentSupplierGroupNotInCompany | 41 | SG-001 | declared in errors.ts |
| ParentSupplierGroupIsLedger | 42 | SG-002 | declared in errors.ts |
| SupplierGroupRootExists | 43 | SG-003 | declared in errors.ts, carrying root |
| SupplierGroupNameTaken | 44 | SG-004 | another supplier group holds this company and supplier group name; by the rule supplier-group.oneNamePerCompany |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### add customers and suppliers

Starts from the world `an outside supplier`.

- **Ada adds a supplier group that is a group, under the root.** `ada` (role company.owner) calls and sends company the world's company, supplierGroupName `Utilities`, parentSupplierGroup the world's allSupplierGroups, isGroup true, and gets back an answer matching `^sgr_`.
- **Ada adds Acme Logistics' root supplier group.** `ada` (role company.owner) calls and sends company the world's otherCompany, supplierGroupName `All Supplier Groups`, isGroup true, and gets back an answer matching `^sgr_`.

### set up party groups

Starts from the world `a supplier group`.

- **nor add a supplier group.** `bo` (signed in) calls and sends company the world's company, supplierGroupName `Raw Materials`, parentSupplierGroup the world's allSupplierGroups, isGroup false, and is refused with NotAllowed, AR-001.
- **a second root is refused, carrying the root.** `ada` (role company.owner) calls and sends company the world's company, supplierGroupName `Vendors`, isGroup true, and is refused with SupplierGroupRootExists, SG-003, carrying root the world's allSupplierGroups.
- **a group under a ledger is refused.** `ada` (role company.owner) calls and sends company the world's company, supplierGroupName `Cleaning`, parentSupplierGroup the world's supplierGroup, isGroup false, and is refused with ParentSupplierGroupIsLedger, SG-002.
- **Ada adds a second ledger supplier group under the root.** `ada` (role company.owner) calls and sends company the world's company, supplierGroupName `Raw Materials`, parentSupplierGroup the world's allSupplierGroups, isGroup false, and gets back an answer matching `^sgr_[0-9a-z]+$`.
- **a name already taken is refused.** `ada` (role company.owner) calls and sends company the world's company, supplierGroupName `Services`, parentSupplierGroup the world's allSupplierGroups, isGroup false, and is refused with SupplierGroupNameTaken, SG-004.
- **a customer group's name is no supplier group's: it is free here.** `ada` (role company.owner) calls and sends company the world's company, supplierGroupName `Commercial`, parentSupplierGroup the world's allSupplierGroups, isGroup false, and is answered.
- **Ada adds a supplier group that is a group, under the root.** `ada` (role company.owner) calls and sends company the world's company, supplierGroupName `Utilities`, parentSupplierGroup the world's allSupplierGroups, isGroup true, and is answered.
- **and a ledger under it, two levels below the root.** `ada` (role company.owner) calls and sends company the world's company, supplierGroupName `Water`, parentSupplierGroup the last call's supplierGroup, isGroup false, and is answered.
- **Acme Logistics may have its own root.** `ada` (role company.owner) calls and sends company the world's otherCompany, supplierGroupName `All Supplier Groups`, isGroup true, and is answered.
- **an Acme Trading group under it is refused.** `ada` (role company.owner) calls and sends company the world's company, supplierGroupName `Fuel`, parentSupplierGroup the last call's supplierGroup, isGroup false, and is refused with ParentSupplierGroupNotInCompany, SG-001.
- **and so is a second root for Acme Logistics, carrying its own root.** `ada` (role company.owner) calls and sends company the world's otherCompany, supplierGroupName `Vendors`, isGroup true, and is refused with SupplierGroupRootExists, SG-003, carrying root the last call's supplierGroup.
- **Acme Logistics adds a ledger under its root.** `ada` (role company.owner) calls and sends company the world's otherCompany, supplierGroupName `Fuel`, parentSupplierGroup the last call's supplierGroup, isGroup false, and is answered.
- **an Acme Trading group under that ledger is refused for its company first.** `ada` (role company.owner) calls and sends company the world's company, supplierGroupName `Diesel`, parentSupplierGroup the last call's supplierGroup, isGroup false, and is refused with ParentSupplierGroupNotInCompany, SG-001.
- **while Acme Logistics' own is refused for the ledger.** `ada` (role company.owner) calls and sends company the world's otherCompany, supplierGroupName `Diesel`, parentSupplierGroup the last call's supplierGroup, isGroup false, and is refused with ParentSupplierGroupIsLedger, SG-002.

## How to call

```sh
capxul supplier-group create --company <company> --supplierGroupName <supplierGroupName> [--parentSupplierGroup <parentSupplierGroup>] --isGroup <isGroup>
```

HTTP: `POST /supplier-group/create` with the payload as JSON. SDK: `Sdk.supplier-group.create(payload)`.
