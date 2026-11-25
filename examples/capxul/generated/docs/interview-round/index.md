<!-- Generated from the blueprint. Do not edit. -->
# interview-round

A stage of a company's hiring, and the employees who usually interview at it.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| company | company.id |
| roundName | Name |
| interviewers | Interviewers |

## Machine

States: active. A move from the wrong state is refused InterviewRoundNotActive (exit 40).

| move | from | to | emits |
|---|---|---|---|
| create | (creates) | active | InterviewRoundCreated |

## Invariants

- `interview-round.oneNamePerCompany`: another interview round holds this company and round name. Unique on company, roundName, in every state; refused RoundNameTaken.

## Events

- `InterviewRoundCreated`: carries interviewRound (interview-round.id), company (interview-round.company); emitted by the move create

## Operations

- [interview-round.create](create.md): Add a stage of hiring to a company, with the employees who interview at it.
- [interview-round.get](get.md): Read one interview-round by its id: company, roundName, interviewers, state.
