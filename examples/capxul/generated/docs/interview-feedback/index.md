<!-- Generated from the blueprint. Do not edit. -->
# interview-feedback

What one interviewer found at an interview.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| company | company.id |
| interview | interview.id |
| interviewer | employee.id |
| result | InterviewResult |

## Machine

States: given. A move from the wrong state is refused InterviewFeedbackNotGiven (exit 40).

| move | from | to | emits |
|---|---|---|---|
| give | (creates) | given | InterviewFeedbackGiven |

## Invariants

- `interview-feedback.oneFeedbackPerInterviewer`: another interview feedback holds this interview and interviewer. Unique on interview, interviewer, in every state; refused FeedbackAlreadyGiven.

## Events

- `InterviewFeedbackGiven`: carries interviewFeedback (interview-feedback.id), interview (interview-feedback.interview), interviewer (interview-feedback.interviewer), result (interview-feedback.result); emitted by the move give

## Operations

- [interview-feedback.get](get.md): Read one interview-feedback by its id: company, interview, interviewer, result, state.
- [interview-feedback.give](give.md): Give an interviewer's feedback on an interview: cleared or rejected.
