<!-- Generated from the blueprint. Do not edit. -->
# interview-round.create

Add a stage of hiring to a company, with the employees who interview at it.

**Who may call:** the owner of its company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| company | interview-round.company |
| roundName | interview-round.roundName |
| interviewers | interview-round.interviewers |

## Answer

| field | value |
|---|---|
| interviewRound | interview-round.id |

## Move

`create`: from nothing (it creates) to active, emitting InterviewRoundCreated.

## Steps

- `interview-round.create.load` (database)
- `interview-round.create.insert` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| RoundInterviewerNotInCompany | 42 | IR-002 | declared in errors.ts |
| RoundInterviewerHasLeft | 43 | IR-003 | declared in errors.ts |
| RoundNameTaken | 41 | IR-001 | another interview round holds this company and round name; by the rule interview-round.oneNamePerCompany, carrying roundName |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### give interview feedback

Starts from the world `an interview`.

- **Ada adds a culture round.** `ada` (role company.owner) calls and sends company the world's company, roundName `Culture`, interviewers [], and gets back an answer matching `^irn_[0-9a-z]+$`.
- **Ada adds the final round.** `ada` (role company.owner) calls and sends company the world's company, roundName `Final`, interviewers [], and gets back an answer matching `^irn_[0-9a-z]+$`.

### schedule an interview

Starts from the world `an outside employee`.

- **Ada adds a technical round to Acme Logistics.** `ada` (role company.owner) calls and sends company the world's otherCompany, roundName `Technical`, interviewers [the world's outsider], and gets back an answer matching `^irn_[0-9a-z]+$`.
- **Ada adds a culture round, with nobody.** `ada` (role company.owner) calls and sends company the world's company, roundName `Culture`, interviewers [], and gets back an answer matching `^irn_[0-9a-z]+$`.
- **Ada adds the final round, with Cy.** `ada` (role company.owner) calls and sends company the world's company, roundName `Final`, interviewers [the world's secondEmployee], and gets back an answer matching `^irn_[0-9a-z]+$`.
- **and adds a panel round to Acme Logistics.** `ada` (role company.owner) calls and sends company the world's otherCompany, roundName `Panel`, interviewers [the world's outsider], and gets back an answer matching `^irn_[0-9a-z]+$`.

### set up interview rounds

Starts from the world `an outside employee`.

- **Bo can't add a round to Acme Trading.** `bo` (signed in) calls and sends company the world's company, roundName `Culture`, interviewers [], and is refused with NotAllowed, AR-001.
- **Ada can't add a second technical round.** `ada` (role company.owner) calls and sends company the world's company, roundName `Technical`, interviewers [the world's secondEmployee], and is refused with RoundNameTaken, IR-001, carrying roundName `Technical`.
- **Ada adds a panel round, with Cy then Olga.** `ada` (role company.owner) calls and sends company the world's company, roundName `Panel`, interviewers [the world's secondEmployee, the world's employee], and gets back an answer matching `^irn_[0-9a-z]+$`.
- **Ada adds a culture round, in lower case, with nobody yet.** `ada` (role company.owner) calls and sends company the world's company, roundName `culture`, interviewers [], and gets back an answer matching `^irn_[0-9a-z]+$`.
- **Acme Logistics may have its own technical round, with Bo.** `ada` (role company.owner) calls and sends company the world's otherCompany, roundName `Technical`, interviewers [the world's outsider], and gets back an answer matching `^irn_[0-9a-z]+$`.
- **Dee's company may have its own technical round too.** `dee` (signed in) calls and sends company the last call's company, roundName `Technical`, interviewers [], and gets back an answer matching `^irn_[0-9a-z]+$`.
- **Ada can't put Bo on an Acme Trading round: he works for Acme Logistics, though she runs both.** `ada` (role company.owner) calls and sends company the world's company, roundName `Final`, interviewers [the world's outsider], and is refused with RoundInterviewerNotInCompany, IR-002.
- **nor after Olga.** `ada` (role company.owner) calls and sends company the world's company, roundName `Final`, interviewers [the world's employee, the world's outsider], and is refused with RoundInterviewerNotInCompany, IR-002.
- **nor put Olga on an Acme Logistics round.** `ada` (role company.owner) calls and sends company the world's otherCompany, roundName `Final`, interviewers [the world's outsider, the world's employee], and is refused with RoundInterviewerNotInCompany, IR-002.
- **Ada can't put Olga on a new round now she has left.** `ada` (role company.owner) calls and sends company the world's company, roundName `Final`, interviewers [the world's employee], and is refused with RoundInterviewerHasLeft, IR-003.
- **nor after Cy.** `ada` (role company.owner) calls and sends company the world's company, roundName `Final`, interviewers [the world's secondEmployee, the world's employee], and is refused with RoundInterviewerHasLeft, IR-003.
- **Olga gone and Bo from another company is refused for Bo first, though Olga comes first.** `ada` (role company.owner) calls and sends company the world's company, roundName `Final`, interviewers [the world's employee, the world's outsider], and is refused with RoundInterviewerNotInCompany, IR-002.
- **Ada adds the final round, with Cy alone.** `ada` (role company.owner) calls and sends company the world's company, roundName `Final`, interviewers [the world's secondEmployee], and gets back an answer matching `^irn_[0-9a-z]+$`.

## How to call

```sh
capxul interview-round create --company <company> --roundName <roundName> --interviewers <interviewers>
```

HTTP: `POST /interview-round/create` with the payload as JSON. SDK: `Sdk.interview-round.create(payload)`.
