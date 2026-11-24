<!-- Generated from the blueprint. Do not edit. -->
# interview

An applicant's interview at one round of hiring, on a day, between two times.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| company | company.id |
| jobApplicant | job-applicant.id |
| interviewRound | interview-round.id |
| scheduledOn | Day |
| fromTime | TimeOfDay |
| toTime | TimeOfDay |
| interviewers | Interviewers |

## Machine

States: pending, cleared, rejected. A move from the wrong state is refused InterviewNotPending (exit 40).

| move | from | to | emits |
|---|---|---|---|
| create | (creates) | pending | InterviewScheduled |
| clear | pending | cleared | InterviewCleared |
| reject | pending | rejected | InterviewRejected |

## Invariants

- `interview.oneInterviewPerRound`: another interview holds this job applicant and interview round. Unique on jobApplicant, interviewRound, in every state; refused InterviewAlreadyScheduled.

## Events

- `InterviewCleared`: carries interview (interview.id); emitted by the move clear
- `InterviewRejected`: carries interview (interview.id); emitted by the move reject
- `InterviewScheduled`: carries interview (interview.id), jobApplicant (interview.jobApplicant), interviewRound (interview.interviewRound); emitted by the move create

## Operations

- [interview.clear](clear.md): Mark an interview cleared.
- [interview.create](create.md): Schedule an applicant's interview at a round, on a day, with the employees who interview.
- [interview.get](get.md): Read one interview by its id: company, jobApplicant, interviewRound, scheduledOn, fromTime, toTime, interviewers, state.
- [interview.reject](reject.md): Mark an interview rejected.
