<!-- Generated from the blueprint. Do not edit. -->
# branch.create

Add a branch to a company.

**Who may call:** the owner of its company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| company | branch.company |
| branchName | branch.branchName |

## Answer

| field | value |
|---|---|
| branch | branch.id |

## Move

`create`: from nothing (it creates) to active, emitting BranchCreated.

## Steps

- `branch.create.insert` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| BranchNameTaken | 41 | BR-001 | another branch holds this company and branch name; by the rule branch.oneNamePerCompany, carrying branchName |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### branch names are the company's

Starts from the world `four branches`.

- **Ada can't add a second branch of the same name.** `ada` (role company.owner) calls and sends company the world's company, branchName `Nairobi`, and is refused with BranchNameTaken, BR-001, carrying branchName `Nairobi`.
- **nor reuse a name her second company holds there.** `ada` (role company.owner) calls and sends company the world's otherCompany, branchName `murang'a  Côte/Est JKIA depot’s አዲስ`, and is refused with BranchNameTaken, BR-001, carrying branchName `murang'a  Côte/Est JKIA depot’s አዲስ`.
- **Bo can't add a branch to Ada's company.** `bo` (signed in) calls and sends company the world's company, branchName `007`, and is refused with NotAllowed, AR-001.
- **Bo adds his company's first branch, named with digits alone.** `bo` (signed in) calls and sends company the world's boCompany, branchName `007`, and gets back an answer matching `^brn_[0-9a-z]+$`.

### set up branches

Starts from the world `a company`.

- **Ada adds a branch.** `ada` (role company.owner) calls and sends company the world's company, branchName `Nairobi`, and gets back an answer matching `^brn_[0-9a-z]+$`.
- **Bo can't add a branch to Ada's company.** `bo` (signed in) calls and sends company the world's company, branchName `Mombasa`, and is refused with NotAllowed, AR-001.

## How to call

```sh
capxul branch create --company <company> --branchName <branchName>
```

HTTP: `POST /branch/create` with the payload as JSON. SDK: `Sdk.branch.create(payload)`.
