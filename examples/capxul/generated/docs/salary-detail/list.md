<!-- Generated from the blueprint. Do not edit. -->
# salary-detail.list

List salary-details, oldest first, 100 to a page, filtered by salaryStructure.

**Who may call:** the owner of its salaryStructure.company.

**A read:** answered from the records, with no handler. A page of 100 at a time, oldest first, narrowed by salaryStructure; pass the answer's `next` as `cursor` for the page after it.

**Budget:** p95 80ms.

## Payload

| field | value |
|---|---|
| salaryStructure (optional) | salary-detail.salaryStructure |
| cursor (optional) | text |

## Answer

| field | value |
|---|---|
| items | schema |
| next | schema |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its salaryStructure.company; the handler never runs |

## Worked examples

### pay a month

Starts from the world `a pension component`.

- **its lines carry what they pay, each table numbered from 1.** `ada` (role company.owner) calls and sends salaryStructure the last call's salaryStructure, and gets back [[`Earning`, `1`, the world's basic, `3000000000`], [`Earning`, `2`, the world's housing, `500000000`], [`Deduction`, `1`, the world's pensionComponent, `150000000`]].
- **Bo can't read them.** `bo` (signed in) calls and sends salaryStructure the last call's items 0 salaryStructure, and is refused with NotAllowed, AR-001.
- **it is paid by the engineers' structure, whose lines it copies.** `ada` (role company.owner) calls and sends salaryStructure the last call's items 0 salaryStructure, and gets back [[`Earning`, `1`, the world's basic, `3000000000`], [`Earning`, `2`, the world's housing, `500000000`], [`Deduction`, `1`, the world's pensionComponent, `150000000`]].

### run a payroll

Starts from the world `an outside cost center`.

- **its lines.** `ada` (role company.owner) calls and sends salaryStructure the last call's salaryStructure, and gets back [[`Earning`, `3000000000`], [`Deduction`, `50000000`], [`Deduction`, `150000000`]].
- **its lines.** `ada` (role company.owner) calls and sends salaryStructure the last call's salaryStructure, and gets back [`100000000`, `3000000000`].

### set up salary structures

Starts from the world `a pension component`.

- **nor its lines.** `bo` (signed in) calls and sends salaryStructure the last call's salaryStructure, and is refused with NotAllowed, AR-001.
- **its lines: earnings then deductions, each numbered from 1, a line given 0 paying its component's amount.** `ada` (role company.owner) calls and sends salaryStructure the last call's salaryStructure, and gets back [[`Earning`, `1`, the world's basic, `3000000000`], [`Earning`, `2`, the world's housing, `500000000`], [`Deduction`, `1`, the world's pensionComponent, `200000000`]].
- **its lines keep the order given.** `ada` (role company.owner) calls and sends salaryStructure the last call's salaryStructure, and gets back [[`Earning`, `1`, the world's housing, `1`], [`Earning`, `2`, the world's basic, `4000000000`]].

## How to call

```sh
capxul salary-detail list [--salaryStructure <salaryStructure>] [--cursor <cursor>]
```

HTTP: `POST /salary-detail/list` with the payload as JSON. SDK: `Sdk.salary-detail.list(payload)`.
