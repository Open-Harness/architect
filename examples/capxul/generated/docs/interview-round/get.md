<!-- Generated from the blueprint. Do not edit. -->
# interview-round.get

Read one interview-round by its id: company, roundName, interviewers, state.

**Who may call:** the owner of its company.

**A read:** answered from the records, with no handler.

**Budget:** p95 50ms.

## Payload

| field | value |
|---|---|
| id | interview-round.id |

## Answer

| field | value |
|---|---|
| company | interview-round.company |
| roundName | interview-round.roundName |
| interviewers | interview-round.interviewers |
| state | text |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its company; the handler never runs |

## Worked examples

### set up interview rounds

Starts from the world `an outside employee`.

- **the technical round reads back with Olga.** `ada` (role company.owner) calls and sends id the world's interviewRound, and gets back [the world's company, `Technical`, [the world's employee], `active`].
- **Olga can't read it.** `olga` (signed in) calls and sends id the world's interviewRound, and is refused with NotAllowed, AR-001.
- **it reads back with both, in the order given.** `ada` (role company.owner) calls and sends id the last call's interviewRound, and gets back [the world's company, `Panel`, [the world's secondEmployee, the world's employee], `active`].
- **it reads back as she typed it, with nobody.** `ada` (role company.owner) calls and sends id the last call's interviewRound, and gets back [`culture`, []].
- **it reads back in Acme Logistics.** `ada` (role company.owner) calls and sends id the last call's interviewRound, and gets back [the world's otherCompany, `Technical`, [the world's outsider]].
- **the technical round still reads back with Olga, who was on it before she left.** `ada` (role company.owner) calls and sends id the world's interviewRound, and gets back [`Technical`, [the world's employee]].

## How to call

```sh
capxul interview-round get --id <id>
```

HTTP: `POST /interview-round/get` with the payload as JSON. SDK: `Sdk.interview-round.get(payload)`.
