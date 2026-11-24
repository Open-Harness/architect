<!-- Generated from the blueprint. Do not edit. -->
# branch.get

Read one branch by its id: company, branchName, state.

**Who may call:** the owner of its company.

**A read:** answered from the records, with no handler.

**Budget:** p95 50ms.

## Payload

| field | value |
|---|---|
| id | branch.id |

## Answer

| field | value |
|---|---|
| company | branch.company |
| branchName | branch.branchName |
| state | text |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its company; the handler never runs |

## Worked examples

### branch names are the company's

Starts from the world `four branches`.

- **the third reads back as typed.** `ada` (role company.owner) calls and sends id the last call's branch, and gets back [the world's company, `Kisumu-West Site 2`, `active`].
- **her first company's first branch is unchanged by every create after it.** `ada` (role company.owner) calls and sends id the world's branch, and gets back [the world's company, `Nairobi`, `active`].
- **the one with the longest name allowed reads back whole.** `ada` (role company.owner) calls and sends id the world's longBranch, and gets back [the world's company, `Mombasa Port, Shed 14 - Cold-Store & Bonded Warehouse (Kilindini Harbour, Gate 2), serving the Coast, Lamu and Tana River counties from 2019`, `active`].
- **her second company's branch of the same name as the first is its own record.** `ada` (role company.owner) calls and sends id the world's otherBranch, and gets back [the world's otherCompany, `Nairobi`, `active`].
- **her second company's other branch keeps every letter and space she typed.** `ada` (role company.owner) calls and sends id the world's oddBranch, and gets back [the world's otherCompany, `murang'a  Côte/Est depot`, `active`].

### set up branches

Starts from the world `a company`.

- **Bo can't read Ada's branch.** `bo` (signed in) calls and sends id the last call's branch, and is refused with NotAllowed, AR-001.
- **Ada reads the branch back.** `ada` (role company.owner) calls and sends id the last call's branch, and gets back [the world's company, `Nairobi`, `active`].
- **it reads back under its own name.** `ada` (role company.owner) calls and sends id the last call's branch, and gets back [the world's company, `Kisumu Depot`, `active`].
- **Ada can't read Bo's branch.** `ada` (role company.owner) calls and sends id the last call's branch, and is refused with NotAllowed, AR-001.
- **Bo reads his branch back, in his own company.** `bo` (signed in) calls and sends id the last call's branch, and gets back [`Kampala`, `active`] and gets back an answer matching `^com_[0-9a-z]+$`.

## How to call

```sh
capxul branch get --id <id>
```

HTTP: `POST /branch/get` with the payload as JSON. SDK: `Sdk.branch.get(payload)`.
