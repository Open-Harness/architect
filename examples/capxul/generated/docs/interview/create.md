<!-- Generated from the blueprint. Do not edit. -->
# interview.create

Schedule an applicant's interview at a round, on a day, with the employees who interview.

**Who may call:** the owner of its jobApplicant.company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 200ms.

## Payload

| field | value |
|---|---|
| jobApplicant | interview.jobApplicant |
| interviewRound | interview.interviewRound |
| scheduledOn | interview.scheduledOn |
| fromTime | interview.fromTime |
| toTime | interview.toTime |
| interviewers | interview.interviewers |

## Answer

| field | value |
|---|---|
| interview | interview.id |

## Move

`create`: from nothing (it creates) to pending, emitting InterviewScheduled.

## Steps

- `interview.create.load` (database)
- `interview.create.insert` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| ApplicantRejected | 41 | IV-001 | declared in errors.ts |
| RoundNotInCompany | 42 | IV-002 | declared in errors.ts |
| InterviewEndsBeforeStart | 43 | IV-003 | declared in errors.ts |
| InterviewerNotInCompany | 44 | IV-004 | declared in errors.ts |
| InterviewerHasLeft | 45 | IV-005 | declared in errors.ts |
| InterviewAlreadyScheduled | 46 | IV-006 | another interview holds this job applicant and interview round; by the rule interview.oneInterviewPerRound |
| InterviewRoundNotFound | 4 | IR-901 | nothing has the id in interviewRound; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its jobApplicant.company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### give interview feedback

Starts from the world `an interview`.

- **and schedules Pat's Culture for Saturday 5 December, with Olga and Cy.** `ada` (role company.owner) calls and sends jobApplicant the world's jobApplicant, interviewRound the last call's interviewRound, scheduledOn `2026-12-05`, fromTime `10:00`, toTime `11:00`, interviewers [the world's employee, the world's secondEmployee], and gets back an answer matching `^ivw_[0-9a-z]+$`.
- **and schedules Pat's Final for today, with Olga alone.** `ada` (role company.owner) calls and sends jobApplicant the world's jobApplicant, interviewRound the last call's interviewRound, scheduledOn `2026-12-03`, fromTime `15:00`, toTime `16:00`, interviewers [the world's employee], and gets back an answer matching `^ivw_[0-9a-z]+$`.

### hire from a job opening

Starts from the world `a technical round`.

- **Ada schedules Pat's Technical with Olga, this afternoon from two to three.** `ada` (role company.owner) calls and sends jobApplicant the last call's jobApplicant, interviewRound the world's interviewRound, scheduledOn `2026-12-01`, fromTime `14:00`, toTime `15:00`, interviewers [the world's employee], and gets back an answer matching `^ivw_[0-9a-z]+$`.

### schedule an interview

Starts from the world `an outside employee`.

- **Bo can't schedule Pat.** `bo` (signed in) calls and sends jobApplicant the world's jobApplicant, interviewRound the world's interviewRound, scheduledOn `2026-12-03`, fromTime `10:00`, toTime `11:00`, interviewers [the world's employee], and is refused with NotAllowed, AR-001.
- **nor can Olga.** `olga` (signed in) calls and sends jobApplicant the world's jobApplicant, interviewRound the world's interviewRound, scheduledOn `2026-12-03`, fromTime `10:00`, toTime `11:00`, interviewers [the world's employee], and is refused with NotAllowed, AR-001.
- **Ada can't schedule one that ends when it starts.** `ada` (role company.owner) calls and sends jobApplicant the world's jobApplicant, interviewRound the world's interviewRound, scheduledOn `2026-12-03`, fromTime `10:00`, toTime `10:00`, interviewers [the world's employee], and is refused with InterviewEndsBeforeStart, IV-003.
- **nor one that ends a quarter of an hour before it starts, in the same hour.** `ada` (role company.owner) calls and sends jobApplicant the world's jobApplicant, interviewRound the world's interviewRound, scheduledOn `2026-12-03`, fromTime `10:30`, toTime `10:15`, interviewers [the world's employee], and is refused with InterviewEndsBeforeStart, IV-003.
- **nor one that runs past midnight.** `ada` (role company.owner) calls and sends jobApplicant the world's jobApplicant, interviewRound the world's interviewRound, scheduledOn `2026-12-03`, fromTime `23:30`, toTime `00:30`, interviewers [the world's employee], and is refused with InterviewEndsBeforeStart, IV-003.
- **nor put Bo on it: he works for Acme Logistics, though she runs both.** `ada` (role company.owner) calls and sends jobApplicant the world's jobApplicant, interviewRound the world's interviewRound, scheduledOn `2026-12-03`, fromTime `10:00`, toTime `11:00`, interviewers [the world's outsider], and is refused with InterviewerNotInCompany, IV-004.
- **nor after Olga.** `ada` (role company.owner) calls and sends jobApplicant the world's jobApplicant, interviewRound the world's interviewRound, scheduledOn `2026-12-03`, fromTime `10:00`, toTime `11:00`, interviewers [the world's employee, the world's outsider], and is refused with InterviewerNotInCompany, IV-004.
- **times are judged before interviewers.** `ada` (role company.owner) calls and sends jobApplicant the world's jobApplicant, interviewRound the world's interviewRound, scheduledOn `2026-12-03`, fromTime `11:00`, toTime `10:00`, interviewers [the world's outsider], and is refused with InterviewEndsBeforeStart, IV-003.
- **she can't interview Pat at it: Pat applied to Acme Trading.** `ada` (role company.owner) calls and sends jobApplicant the world's jobApplicant, interviewRound the last call's interviewRound, scheduledOn `2026-12-03`, fromTime `10:00`, toTime `11:00`, interviewers [the world's employee], and is refused with RoundNotInCompany, IV-002.
- **the round is judged before the times.** `ada` (role company.owner) calls and sends jobApplicant the world's jobApplicant, interviewRound the last call's interviewRound, scheduledOn `2026-12-03`, fromTime `11:00`, toTime `10:00`, interviewers [the world's outsider], and is refused with RoundNotInCompany, IV-002.
- **Ada schedules Pat's Technical with Cy and Olga, ten to half past.** `ada` (role company.owner) calls and sends jobApplicant the world's jobApplicant, interviewRound the world's interviewRound, scheduledOn `2026-12-03`, fromTime `10:00`, toTime `10:30`, interviewers [the world's secondEmployee, the world's employee], and gets back an answer matching `^ivw_[0-9a-z]+$`.
- **Ada can't schedule Pat's Technical twice.** `ada` (role company.owner) calls and sends jobApplicant the world's jobApplicant, interviewRound the world's interviewRound, scheduledOn `2026-12-04`, fromTime `14:00`, toTime `15:00`, interviewers [the world's secondEmployee], and is refused with InterviewAlreadyScheduled, IV-006.
- **Pat's Technical still can't be scheduled again, now the first is rejected.** `ada` (role company.owner) calls and sends jobApplicant the world's jobApplicant, interviewRound the world's interviewRound, scheduledOn `2026-12-04`, fromTime `14:00`, toTime `15:00`, interviewers [the world's secondEmployee], and is refused with InterviewAlreadyScheduled, IV-006.
- **Pat may be interviewed at another round, a minute long, late on a day already past.** `ada` (role company.owner) calls and sends jobApplicant the world's jobApplicant, interviewRound the last call's interviewRound, scheduledOn `2026-11-20`, fromTime `23:58`, toTime `23:59`, interviewers [the world's employee], and gets back an answer matching `^ivw_[0-9a-z]+$`.
- **she can't put Olga on a new interview now she has left.** `ada` (role company.owner) calls and sends jobApplicant the world's jobApplicant, interviewRound the last call's interviewRound, scheduledOn `2026-12-07`, fromTime `09:00`, toTime `10:00`, interviewers [the world's employee], and is refused with InterviewerHasLeft, IV-005.
- **nor after Cy.** `ada` (role company.owner) calls and sends jobApplicant the world's jobApplicant, interviewRound the last call's interviewRound, scheduledOn `2026-12-07`, fromTime `09:00`, toTime `10:00`, interviewers [the world's secondEmployee, the world's employee], and is refused with InterviewerHasLeft, IV-005.
- **Olga gone and Bo from another company is refused for Bo, though Olga comes first.** `ada` (role company.owner) calls and sends jobApplicant the world's jobApplicant, interviewRound the last call's interviewRound, scheduledOn `2026-12-07`, fromTime `09:00`, toTime `10:00`, interviewers [the world's employee, the world's outsider], and is refused with InterviewerNotInCompany, IV-004.
- **Cy alone may interview Pat at Final, on a day still to come.** `ada` (role company.owner) calls and sends jobApplicant the world's jobApplicant, interviewRound the last call's interviewRound, scheduledOn `2027-01-11`, fromTime `09:00`, toTime `17:00`, interviewers [the world's secondEmployee], and gets back an answer matching `^ivw_[0-9a-z]+$`.
- **she can't then interview Sam.** `ada` (role company.owner) calls and sends jobApplicant the last call's jobApplicant, interviewRound the world's interviewRound, scheduledOn `2026-12-07`, fromTime `09:00`, toTime `10:00`, interviewers [the world's secondEmployee], and is refused with ApplicantRejected, IV-001.
- **a rejected applicant is judged first, before the times and the interviewers.** `ada` (role company.owner) calls and sends jobApplicant the last call's jobApplicant, interviewRound the world's interviewRound, scheduledOn `2026-12-07`, fromTime `10:00`, toTime `09:00`, interviewers [the world's employee, the world's outsider], and is refused with ApplicantRejected, IV-001.

## How to call

```sh
capxul interview create --jobApplicant <jobApplicant> --interviewRound <interviewRound> --scheduledOn <scheduledOn> --fromTime <fromTime> --toTime <toTime> --interviewers <interviewers>
```

HTTP: `POST /interview/create` with the payload as JSON. SDK: `Sdk.interview.create(payload)`.
