<!-- Generated from the blueprint. Do not edit. -->
# interview-feedback.get

Read one interview-feedback by its id: company, interview, interviewer, result, state.

**Who may call:** the self of its interviewer, or the owner of its company.

**A read:** answered from the records, with no handler.

**Budget:** p95 50ms.

## Payload

| field | value |
|---|---|
| id | interview-feedback.id |

## Answer

| field | value |
|---|---|
| company | interview-feedback.company |
| interview | interview-feedback.interview |
| interviewer | interview-feedback.interviewer |
| result | interview-feedback.result |
| state | text |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the self of its interviewer, or the owner of its company; the handler never runs |

## Worked examples

### give interview feedback

Starts from the world `an interview`.

- **Cy can't read Olga's.** `cy` (signed in) calls and sends id the last call's interviewFeedback, and is refused with NotAllowed, AR-001.
- **it reads back in Acme Trading, as she gave it.** `olga` (signed in) calls and sends id the last call's interviewFeedback, and gets back [the world's company, the world's interview, the world's employee, `Cleared`, `given`].
- **Ada reads it back rejected.** `ada` (role company.owner) calls and sends id the last call's interviewFeedback, and gets back [the world's company, the world's employee, `Rejected`].
- **it reads back as hers.** `cy` (signed in) calls and sends id the last call's interviewFeedback, and gets back [the world's company, the world's interview, the world's secondEmployee, `Rejected`, `given`].

### hire from a job opening

Starts from the world `a technical round`.

- **Ada reads Olga's feedback.** `ada` (role company.owner) calls and sends id the last call's interviewFeedback, and gets back [the world's company, the world's employee, `Cleared`, `given`].

## How to call

```sh
capxul interview-feedback get --id <id>
```

HTTP: `POST /interview-feedback/get` with the payload as JSON. SDK: `Sdk.interview-feedback.get(payload)`.
