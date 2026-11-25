<!-- Generated from the blueprint. Do not edit. -->
# cost-center.get

Read one cost-center by its id: company, costCenterName, parentCostCenter, state.

**Who may call:** the owner of its company.

**A read:** answered from the records, with no handler.

**Budget:** p95 50ms.

## Payload

| field | value |
|---|---|
| id | cost-center.id |

## Answer

| field | value |
|---|---|
| company | cost-center.company |
| costCenterName | cost-center.costCenterName |
| parentCostCenter (optional) | cost-center.parentCostCenter |
| state | text |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its company; the handler never runs |

## Worked examples

### post a journal entry

Starts from the world `a capital entry`.

- **and that cost center is the new one, not Bank's.** `ada` (role company.owner) calls and sends id the last call's items 1 costCenter, and gets back [the world's company, `Sales`, `ledger`].

### set up cost centers

Starts from the world `a chart`.

- **Acme Trading's ledger cost center reads back under its root.** `ada` (role company.owner) calls and sends id the world's costCenter, and gets back [the world's company, `Operations`, the world's mainCostCenter, `ledger`].
- **the root reads back a group with no parent.** `ada` (role company.owner) calls and sends id the world's mainCostCenter, and gets back [the world's company, `Acme Trading`, null, `group`].
- **Bo can't read it.** `bo` (signed in) calls and sends id the world's costCenter, and is refused with NotAllowed, AR-001.
- **Nairobi reads back under Regions.** `ada` (role company.owner) calls and sends id the last call's costCenter, and gets back [the world's company, `Nairobi`, `ledger`] and gets back an answer matching `^cct_[0-9a-z]+$`.
- **and that ledger is the other company's.** `ada` (role company.owner) calls and sends id the last call's costCenter, and gets back [the world's otherCompany, `Operations`, `ledger`].

## How to call

```sh
capxul cost-center get --id <id>
```

HTTP: `POST /cost-center/get` with the payload as JSON. SDK: `Sdk.cost-center.get(payload)`.
