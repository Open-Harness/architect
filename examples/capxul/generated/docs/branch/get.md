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

Starts from the world `a branch`.

- **the branch she had is left as it was.** `ada` (role company.owner) calls and sends id the world's branch, and gets back [the world's company, `Nairobi`, `active`].
- **it reads back whole.** `ada` (role company.owner) calls and sends id the last call's branch, and gets back [the world's company, `Mombasa Port, Shed 14 - Cold-Store & Bonded Warehouse (Kilindini Harbour, Gate 2), serving the Coast, Lamu and Tana River counties from 2019`, `active`].
- **the third reads back as typed.** `ada` (role company.owner) calls and sends id the last call's branch, and gets back [the world's company, `Kisumu-West Site 2`, `active`].
- **her first branch is unchanged by the two after it.** `ada` (role company.owner) calls and sends id the world's branch, and gets back [the world's company, `Nairobi`, `active`].
- **that branch is the second company's own record.** `ada` (role company.owner) calls and sends id the last call's branch, and gets back [the world's otherCompany, `Nairobi`, `active`].
- **it is filed under the second company.** `ada` (role company.owner) calls and sends id the last call's branch, and gets back [the world's otherCompany, `Eldoret Depot 3`, `active`].
- **and the first company's first branch still reads back as before.** `ada` (role company.owner) calls and sends id the world's branch, and gets back [the world's company, `Nairobi`, `active`].

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
