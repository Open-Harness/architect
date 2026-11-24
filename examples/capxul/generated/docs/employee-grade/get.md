<!-- Generated from the blueprint. Do not edit. -->
# employee-grade.get

Read one employee-grade by its id: company, gradeName, state.

**Who may call:** the owner of its company.

**A read:** answered from the records, with no handler.

**Budget:** p95 50ms.

## Payload

| field | value |
|---|---|
| id | employee-grade.id |

## Answer

| field | value |
|---|---|
| company | employee-grade.company |
| gradeName | employee-grade.gradeName |
| state | text |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its company; the handler never runs |

## Worked examples

### grade names are the company's

Starts from the world `a grade`.

- **the grade she had is left as it was.** `ada` (role company.owner) calls and sends id the world's grade, and gets back [the world's company, `Senior`, `active`].
- **that grade is its own record, not the first company's.** `ada` (role company.owner) calls and sends id the last call's grade, and gets back [`Senior`, `active`] and gets back an answer matching `^com_[0-9a-z]+$`.
- **and the first company's grade still reads back as before.** `ada` (role company.owner) calls and sends id the world's grade, and gets back [the world's company, `Senior`, `active`].

### set up grades

Starts from the world `a company`.

- **Bo can't read Ada's grade.** `bo` (signed in) calls and sends id the last call's grade, and is refused with NotAllowed, AR-001.
- **Ada reads the grade back.** `ada` (role company.owner) calls and sends id the last call's grade, and gets back [the world's company, `Junior`, `active`].
- **it reads back under its own name.** `ada` (role company.owner) calls and sends id the last call's grade, and gets back [the world's company, `Principal Engineer II`, `active`].
- **Ada can't read Bo's grade.** `ada` (role company.owner) calls and sends id the last call's grade, and is refused with NotAllowed, AR-001.
- **Bo reads his grade back, in his own company.** `bo` (signed in) calls and sends id the last call's grade, and gets back [`Associate`, `active`] and gets back an answer matching `^com_[0-9a-z]+$`.

## How to call

```sh
capxul employee-grade get --id <id>
```

HTTP: `POST /employee-grade/get` with the payload as JSON. SDK: `Sdk.employee-grade.get(payload)`.
