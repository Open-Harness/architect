<!-- Generated from the blueprint. Do not edit. -->
# interview-feedback.give

Give an interviewer's feedback on an interview: cleared or rejected.

**Who may call:** the self of its interviewer.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| interview | interview-feedback.interview |
| interviewer | interview-feedback.interviewer |
| result | interview-feedback.result |

## Answer

| field | value |
|---|---|
| interviewFeedback | interview-feedback.id |

## Move

`give`: from nothing (it creates) to given, emitting InterviewFeedbackGiven.

## Steps

- `interview-feedback.give.load` (database)
- `interview-feedback.give.insert` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| FeedbackGiverNotInterviewer | 41 | IF-001 | declared in errors.ts |
| FeedbackBeforeInterview | 42 | IF-002 | declared in errors.ts, carrying scheduledOn |
| FeedbackAlreadyGiven | 43 | IF-003 | another interview feedback holds this interview and interviewer; by the rule interview-feedback.oneFeedbackPerInterviewer |
| InterviewNotFound | 4 | IV-901 | nothing has the id in interview; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the self of its interviewer; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### give interview feedback

Starts from the world `an interview`.

- **Olga can't give feedback two days before the interview.** `olga` (signed in) calls and sends interview the world's interview, interviewer the world's employee, result `Cleared`, and is refused with FeedbackBeforeInterview, IF-002, carrying scheduledOn `2026-12-03`.
- **Ada can't give it for her.** `ada` (role company.owner) calls and sends interview the world's interview, interviewer the world's employee, result `Cleared`, and is refused with NotAllowed, AR-001.
- **nor can Bo.** `bo` (signed in) calls and sends interview the world's interview, interviewer the world's employee, result `Rejected`, and is refused with NotAllowed, AR-001.
- **Bo can't give his own: he isn't one of its interviewers, which is judged before the day.** `bo` (signed in) calls and sends interview the world's interview, interviewer the world's outsider, result `Rejected`, and is refused with FeedbackGiverNotInterviewer, IF-001.
- **Olga still can't give it.** `olga` (signed in) calls and sends interview the world's interview, interviewer the world's employee, result `Cleared`, and is refused with FeedbackBeforeInterview, IF-002, carrying scheduledOn `2026-12-03`.
- **nor can Cy.** `cy` (signed in) calls and sends interview the world's interview, interviewer the world's secondEmployee, result `Rejected`, and is refused with FeedbackBeforeInterview, IF-002, carrying scheduledOn `2026-12-03`.
- **Bo still can't give his own.** `bo` (signed in) calls and sends interview the world's interview, interviewer the world's outsider, result `Cleared`, and is refused with FeedbackGiverNotInterviewer, IF-001.
- **Olga clears Pat, on the day itself.** `olga` (signed in) calls and sends interview the world's interview, interviewer the world's employee, result `Cleared`, and gets back an answer matching `^ifb_[0-9a-z]+$`.
- **Olga can't give a second, even another result.** `olga` (signed in) calls and sends interview the world's interview, interviewer the world's employee, result `Rejected`, and is refused with FeedbackAlreadyGiven, IF-003.
- **Olga can't give feedback on that one yet: its own day is judged.** `olga` (signed in) calls and sends interview the last call's interview, interviewer the world's employee, result `Cleared`, and is refused with FeedbackBeforeInterview, IF-002, carrying scheduledOn `2026-12-05`.
- **nor Cy.** `cy` (signed in) calls and sends interview the last call's interview, interviewer the world's secondEmployee, result `Cleared`, and is refused with FeedbackBeforeInterview, IF-002, carrying scheduledOn `2026-12-05`.
- **Cy can't give feedback on it: she isn't one of its interviewers.** `cy` (signed in) calls and sends interview the last call's interview, interviewer the world's secondEmployee, result `Cleared`, and is refused with FeedbackGiverNotInterviewer, IF-001.
- **Olga, who gave feedback on Technical, may give it on Final too.** `olga` (signed in) calls and sends interview the last call's interview, interviewer the world's employee, result `Rejected`, and gets back an answer matching `^ifb_[0-9a-z]+$`.
- **Cy, who has left, still gives her feedback on the Technical interview she was on, now decided.** `cy` (signed in) calls and sends interview the world's interview, interviewer the world's secondEmployee, result `Rejected`, and gets back an answer matching `^ifb_[0-9a-z]+$`.
- **Cy can't give a second.** `cy` (signed in) calls and sends interview the world's interview, interviewer the world's secondEmployee, result `Cleared`, and is refused with FeedbackAlreadyGiven, IF-003.

### hire from a job opening

Starts from the world `a technical round`.

- **Olga clears Pat the same day.** `olga` (signed in) calls and sends interview the last call's interview, interviewer the world's employee, result `Cleared`, and gets back an answer matching `^ifb_[0-9a-z]+$`.

## How to call

```sh
capxul interview-feedback give --interview <interview> --interviewer <interviewer> --result <result>
```

HTTP: `POST /interview-feedback/give` with the payload as JSON. SDK: `Sdk.interview-feedback.give(payload)`.
