<!-- Generated from the blueprint. Do not edit. -->
# interview.get

Read one interview by its id: company, jobApplicant, interviewRound, scheduledOn, fromTime, toTime, interviewers, state.

**Who may call:** the owner of its company.

**A read:** answered from the records, with no handler.

**Budget:** p95 50ms.

## Payload

| field | value |
|---|---|
| id | interview.id |

## Answer

| field | value |
|---|---|
| company | interview.company |
| jobApplicant | interview.jobApplicant |
| interviewRound | interview.interviewRound |
| scheduledOn | interview.scheduledOn |
| fromTime | interview.fromTime |
| toTime | interview.toTime |
| interviewers | interview.interviewers |
| state | text |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its company; the handler never runs |

## Worked examples

### give interview feedback

Starts from the world `an interview`.

- **the interview is still pending: feedback doesn't decide it.** `ada` (role company.owner) calls and sends id the world's interview, and gets back `pending`.

### hire from a job opening

Starts from the world `a technical round`.

- **the interview reads back cleared, Pat's, at Technical.** `ada` (role company.owner) calls and sends id the last call's interview, and gets back [the world's company, the world's interviewRound, `2026-12-01`, `14:00`, `15:00`, [the world's employee], `cleared`].

### schedule an interview

Starts from the world `an outside employee`.

- **Olga can't read it.** `olga` (signed in) calls and sends id the last call's interview, and is refused with NotAllowed, AR-001.
- **it reads back in Acme Trading, as she set it, rejected.** `ada` (role company.owner) calls and sends id the last call's interview, and gets back [the world's company, the world's jobApplicant, the world's interviewRound, `2026-12-03`, `10:00`, `10:30`, [the world's secondEmployee, the world's employee], `rejected`].
- **it reads back with Olga alone, cleared.** `ada` (role company.owner) calls and sends id the last call's interview, and gets back [`2026-11-20`, `23:58`, `23:59`, [the world's employee], `cleared`].

## How to call

```sh
capxul interview get --id <id>
```

HTTP: `POST /interview/get` with the payload as JSON. SDK: `Sdk.interview.get(payload)`.
