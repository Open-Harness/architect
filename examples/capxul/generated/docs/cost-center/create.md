<!-- Generated from the blueprint. Do not edit. -->
# cost-center.create

Add a cost center to a company, under a group or as a root.

**Who may call:** the owner of its company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

| field | value | description |
|---|---|---|
| company | cost-center.company |  |
| costCenterName | cost-center.costCenterName |  |
| parentCostCenter (optional) | cost-center.parentCostCenter |  |
| isGroup | schema | Make it a group, which other cost centers sit under, rather than a ledger, which takes entries. |

## Answer

| field | value |
|---|---|
| costCenter | cost-center.id |

## Move

`create`: from nothing (it creates) to group or ledger, emitting CostCenterCreated.

## Steps

- `cost-center.create.load` (database)
- `cost-center.create.insert` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| ParentCostCenterNotInCompany | 41 | CC-001 | declared in errors.ts |
| ParentCostCenterIsLedger | 42 | CC-002 | declared in errors.ts |
| RootCostCenterIsLedger | 43 | CC-003 | declared in errors.ts |
| CostCenterNameTaken | 44 | CC-004 | another cost center holds this company and cost center name; by the rule cost-center.oneNamePerCompany |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### draft a journal entry

Starts from the world `a fiscal year`.

- **Ada adds a root cost center to her other company.** `ada` (role company.owner) calls and sends company the world's otherCompany, costCenterName `Acme Logistics`, isGroup true, and gets back an answer matching `^cct_`.
- **and a ledger cost center under it.** `ada` (role company.owner) calls and sends company the world's otherCompany, costCenterName `Operations`, parentCostCenter the last call's costCenter, isGroup false, and gets back an answer matching `^cct_`.

### post a journal entry

Starts from the world `a capital entry`.

- **Ada adds a second ledger cost center under the root.** `ada` (role company.owner) calls and sends company the world's company, costCenterName `Sales`, parentCostCenter the world's mainCostCenter, isGroup false, and gets back an answer matching `^cct_[0-9a-z]+$`.

### set up cost centers

Starts from the world `a chart`.

- **nor add a cost center to Acme Trading.** `bo` (signed in) calls and sends company the world's company, costCenterName `Sales`, parentCostCenter the world's mainCostCenter, isGroup false, and is refused with NotAllowed, AR-001.
- **Ada adds Regions, a group under the root.** `ada` (role company.owner) calls and sends company the world's company, costCenterName `Regions`, parentCostCenter the world's mainCostCenter, isGroup true, and gets back an answer matching `^cct_[0-9a-z]+$`.
- **and Nairobi, a ledger under Regions.** `ada` (role company.owner) calls and sends company the world's company, costCenterName `Nairobi`, parentCostCenter the last call's costCenter, isGroup false, and is answered.
- **a cost center under a ledger is refused.** `ada` (role company.owner) calls and sends company the world's company, costCenterName `Sales`, parentCostCenter the world's costCenter, isGroup false, and is refused with ParentCostCenterIsLedger, CC-002.
- **a group under one too.** `ada` (role company.owner) calls and sends company the world's company, costCenterName `Sales`, parentCostCenter the world's costCenter, isGroup true, and is refused with ParentCostCenterIsLedger, CC-002.
- **a root that isn't a group is refused.** `ada` (role company.owner) calls and sends company the world's company, costCenterName `Head Office`, isGroup false, and is refused with RootCostCenterIsLedger, CC-003.
- **a second cost center under a taken name is refused, under any parent.** `ada` (role company.owner) calls and sends company the world's company, costCenterName `Operations`, parentCostCenter the world's mainCostCenter, isGroup true, and is refused with CostCenterNameTaken, CC-004.
- **a taken name under a ledger is refused for the ledger first.** `ada` (role company.owner) calls and sends company the world's company, costCenterName `Operations`, parentCostCenter the world's costCenter, isGroup false, and is refused with ParentCostCenterIsLedger, CC-002.
- **Ada's other company starts its own cost centers, under its own name.** `ada` (role company.owner) calls and sends company the world's otherCompany, costCenterName `Acme Logistics`, isGroup true, and is answered.
- **an Acme Trading cost center under it is refused.** `ada` (role company.owner) calls and sends company the world's company, costCenterName `Kampala`, parentCostCenter the last call's costCenter, isGroup false, and is refused with ParentCostCenterNotInCompany, CC-001.
- **the other company may reuse Acme Trading's ledger's name for a ledger of its own.** `ada` (role company.owner) calls and sends company the world's otherCompany, costCenterName `Operations`, parentCostCenter the last call's costCenter, isGroup false, and is answered.
- **an Acme Trading cost center under that ledger is refused for the company first.** `ada` (role company.owner) calls and sends company the world's company, costCenterName `Kampala`, parentCostCenter the last call's costCenter, isGroup true, and is refused with ParentCostCenterNotInCompany, CC-001.

## How to call

```sh
capxul cost-center create --company <company> --costCenterName <costCenterName> [--parentCostCenter <parentCostCenter>] --isGroup <isGroup>
```

HTTP: `POST /cost-center/create` with the payload as JSON. SDK: `Sdk.cost-center.create(payload)`.
