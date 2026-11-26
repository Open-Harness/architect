<!-- Generated from the blueprint. Do not edit. -->
# customer-group.create

Add a customer group to a company, under a group or as its one root.

**Who may call:** the owner of its company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

| field | value | description |
|---|---|---|
| company | customer-group.company |  |
| customerGroupName | customer-group.customerGroupName |  |
| parentCustomerGroup (optional) | customer-group.parentCustomerGroup |  |
| isGroup | YesNo | Make it a group, which other customer groups sit under, rather than a ledger, which customers are put in. |

## Answer

| field | value |
|---|---|
| customerGroup | customer-group.id |

## Move

`create`: from nothing (it creates) to group or ledger, emitting CustomerGroupCreated.

## Steps

- `customer-group.create.load` (database)
- `customer-group.create.insert` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| ParentCustomerGroupNotInCompany | 41 | CG-001 | declared in errors.ts |
| ParentCustomerGroupIsLedger | 42 | CG-002 | declared in errors.ts |
| CustomerGroupRootExists | 43 | CG-003 | declared in errors.ts, carrying root |
| CustomerGroupNameTaken | 44 | CG-004 | another customer group holds this company and customer group name; by the rule customer-group.oneNamePerCompany |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### add customers and suppliers

Starts from the world `an outside supplier`.

- **Ada adds a customer group that is a group, under the root.** `ada` (role company.owner) calls and sends company the world's company, customerGroupName `Retail`, parentCustomerGroup the world's allCustomerGroups, isGroup true, and gets back an answer matching `^cgr_`.
- **Ada adds Acme Logistics' root customer group.** `ada` (role company.owner) calls and sends company the world's otherCompany, customerGroupName `All Customer Groups`, isGroup true, and gets back an answer matching `^cgr_`.

### set up party groups

Starts from the world `a supplier group`.

- **nor add a customer group to Acme Trading.** `bo` (signed in) calls and sends company the world's company, customerGroupName `Retail`, parentCustomerGroup the world's allCustomerGroups, isGroup true, and is refused with NotAllowed, AR-001.
- **a second root for Acme Trading is refused, carrying the root it has.** `ada` (role company.owner) calls and sends company the world's company, customerGroupName `Everyone`, isGroup true, and is refused with CustomerGroupRootExists, CG-003, carrying root the world's allCustomerGroups.
- **as a ledger too.** `ada` (role company.owner) calls and sends company the world's company, customerGroupName `Everyone`, isGroup false, and is refused with CustomerGroupRootExists, CG-003, carrying root the world's allCustomerGroups.
- **and before the name it would take twice: the root is judged first.** `ada` (role company.owner) calls and sends company the world's company, customerGroupName `All Customer Groups`, isGroup true, and is refused with CustomerGroupRootExists, CG-003, carrying root the world's allCustomerGroups.
- **a group under a ledger is refused.** `ada` (role company.owner) calls and sends company the world's company, customerGroupName `Corner Shops`, parentCustomerGroup the world's customerGroup, isGroup false, and is refused with ParentCustomerGroupIsLedger, CG-002.
- **before a name already taken.** `ada` (role company.owner) calls and sends company the world's company, customerGroupName `Commercial`, parentCustomerGroup the world's customerGroup, isGroup true, and is refused with ParentCustomerGroupIsLedger, CG-002.
- **Ada adds a group under the root.** `ada` (role company.owner) calls and sends company the world's company, customerGroupName `Retail`, parentCustomerGroup the world's allCustomerGroups, isGroup true, and gets back an answer matching `^cgr_[0-9a-z]+$`.
- **a name already taken in the company is refused, under another parent.** `ada` (role company.owner) calls and sends company the world's company, customerGroupName `Commercial`, parentCustomerGroup the last call's customerGroup, isGroup false, and is refused with CustomerGroupNameTaken, CG-004.
- **Ada adds a ledger under the new group, two levels below the root.** `ada` (role company.owner) calls and sends company the world's company, customerGroupName `Corner Shops`, parentCustomerGroup the last call's customerGroup, isGroup false, and is answered.
- **Acme Logistics may have its own root, of the same name.** `ada` (role company.owner) calls and sends company the world's otherCompany, customerGroupName `All Customer Groups`, isGroup true, and is answered.
- **a second root for Acme Logistics carries its own root, not Acme Trading's.** `ada` (role company.owner) calls and sends company the world's otherCompany, customerGroupName `Everyone`, isGroup true, and is refused with CustomerGroupRootExists, CG-003, carrying root the last call's customerGroup.
- **an Acme Trading group under Acme Logistics' root is refused.** `ada` (role company.owner) calls and sends company the world's company, customerGroupName `Exporters`, parentCustomerGroup the last call's customerGroup, isGroup false, and is refused with ParentCustomerGroupNotInCompany, CG-001.
- **Acme Logistics may have a ledger group of the same name as Acme Trading's, under its root.** `ada` (role company.owner) calls and sends company the world's otherCompany, customerGroupName `Commercial`, parentCustomerGroup the last call's customerGroup, isGroup false, and is answered.
- **an Acme Trading group under that ledger is refused for its company first.** `ada` (role company.owner) calls and sends company the world's company, customerGroupName `Exporters`, parentCustomerGroup the last call's customerGroup, isGroup false, and is refused with ParentCustomerGroupNotInCompany, CG-001.
- **while Acme Logistics' own is refused for the ledger.** `ada` (role company.owner) calls and sends company the world's otherCompany, customerGroupName `Exporters`, parentCustomerGroup the last call's customerGroup, isGroup false, and is refused with ParentCustomerGroupIsLedger, CG-002.

## How to call

```sh
capxul customer-group create --company <company> --customerGroupName <customerGroupName> [--parentCustomerGroup <parentCustomerGroup>] --isGroup <isGroup>
```

HTTP: `POST /customer-group/create` with the payload as JSON. SDK: `Sdk.customer-group.create(payload)`.
