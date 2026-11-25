<!-- Generated from the blueprint. Do not edit. -->
# employee-separation.get

Read one employee-separation by its id: company, employee, resignationLetterDate, boardingBeginsOn, state.

**Who may call:** the owner of its company.

**A read:** answered from the records, with no handler.

**Budget:** p95 50ms.

## Payload

| field | value |
|---|---|
| id | employee-separation.id |

## Answer

| field | value |
|---|---|
| company | employee-separation.company |
| employee | employee-separation.employee |
| resignationLetterDate | employee-separation.resignationLetterDate |
| boardingBeginsOn | employee-separation.boardingBeginsOn |
| state | text |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its company; the handler never runs |

## Worked examples

### move an employee through the company

Starts from the world `a new hire`.

- **the separation reads back completed, Dee's.** `ada` (role company.owner) calls and sends id the last call's employeeSeparation, and gets back [the world's company, the world's newHire, `2026-11-30`, `2026-12-14`, `completed`].

### run a separation

Starts from the world `a separation`.

- **Olga's separation reads back pending, from her letter of 20 November, beginning 1 December.** `ada` (role company.owner) calls and sends id the world's employeeSeparation, and gets back [the world's company, the world's employee, `2026-11-20`, `2026-12-01`, `pending`].
- **Olga can't read it: only the owner does.** `olga` (signed in) calls and sends id the world's employeeSeparation, and is refused with NotAllowed, AR-001.
- **nor can Bo.** `bo` (signed in) calls and sends id the world's employeeSeparation, and is refused with NotAllowed, AR-001.
- **it reads back completed, as it was started.** `ada` (role company.owner) calls and sends id the world's employeeSeparation, and gets back [the world's company, the world's employee, `2026-11-20`, `2026-12-01`, `completed`].
- **the new one reads back completed, with its own days.** `ada` (role company.owner) calls and sends id the last call's employeeSeparation, and gets back [the world's employee, `2026-11-25`, `2026-12-03`, `completed`].

## How to call

```sh
capxul employee-separation get --id <id>
```

HTTP: `POST /employee-separation/get` with the payload as JSON. SDK: `Sdk.employee-separation.get(payload)`.
