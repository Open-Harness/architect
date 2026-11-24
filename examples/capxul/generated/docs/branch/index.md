<!-- Generated from the blueprint. Do not edit. -->
# branch

A place a company works from, such as an office or a site.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| company | company.id |
| branchName | Name |

## Machine

States: active. A move from the wrong state is refused BranchNotActive (exit 40).

| move | from | to | emits |
|---|---|---|---|
| create | (creates) | active | BranchCreated |

## Invariants

- `branch.oneNamePerCompany`: another branch holds this company and branch name. Unique on company, branchName, in every state; refused BranchNameTaken.

## Events

- `BranchCreated`: carries branch (branch.id), company (branch.company); emitted by the move create

## Operations

- [branch.create](create.md): Add a branch to a company.
- [branch.get](get.md): Read one branch by its id: company, branchName, state.
