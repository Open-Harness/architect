<!-- Generated from the blueprint. Do not edit. -->
# salary-structure.get

Read one salary-structure by its id: company, salaryStructureName, totalEarning, totalDeduction, netPay, state.

**Who may call:** the owner of its company.

**A read:** answered from the records, with no handler.

**Budget:** p95 50ms.

## Payload

| field | value |
|---|---|
| id | salary-structure.id |

## Answer

| field | value | description |
|---|---|---|
| company | salary-structure.company |  |
| salaryStructureName | salary-structure.salaryStructureName |  |
| totalEarning | salary-structure.totalEarning |  |
| totalDeduction | salary-structure.totalDeduction |  |
| netPay | salary-structure.netPay | Its earnings less its deductions, in USDC base units. |
| state | text |  |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its company; the handler never runs |

## Worked examples

### set up salary structures

Starts from the world `a pension component`.

- **Bo can't read it.** `bo` (signed in) calls and sends id the last call's salaryStructure, and is refused with NotAllowed, AR-001.
- **it reads back cancelled, its totals kept.** `ada` (role company.owner) calls and sends id the last call's salaryStructure, and gets back [the world's company, `Engineers`, `3500000000`, `200000000`, `3300000000`, `cancelled`].
- **it stays a draft.** `ada` (role company.owner) calls and sends id the last call's salaryStructure, and gets back [`-50000000`, `draft`].

## How to call

```sh
capxul salary-structure get --id <id>
```

HTTP: `POST /salary-structure/get` with the payload as JSON. SDK: `Sdk.salary-structure.get(payload)`.
