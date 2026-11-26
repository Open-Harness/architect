<!-- Generated from the blueprint. Do not edit. -->
# salary-slip-detail.list

List salary-slip-details, oldest first, 100 to a page, filtered by salarySlip.

**Who may call:** the self of its salarySlip.employee, or the owner of its salarySlip.company.

**A read:** answered from the records, with no handler. A page of 100 at a time, oldest first, narrowed by salarySlip; pass the answer's `next` as `cursor` for the page after it.

**Budget:** p95 80ms.

## Payload

| field | value |
|---|---|
| salarySlip (optional) | salary-slip-detail.salarySlip |
| cursor (optional) | text |

## Answer

| field | value |
|---|---|
| items | schema |
| next | schema |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the self of its salarySlip.employee, or the owner of its salarySlip.company; the handler never runs |

## Worked examples

### pay a month

Starts from the world `a pension component`.

- **its lines are its structure's, earnings then deductions.** `ada` (role company.owner) calls and sends salarySlip the last call's items 0 id, and gets back [[`Earning`, `1`, the world's basic, `3000000000`], [`Earning`, `2`, the world's housing, `500000000`], [`Deduction`, `1`, the world's pensionComponent, `150000000`]].
- **nor its lines.** `cy` (signed in) calls and sends salarySlip the last call's items 0 salarySlip, and is refused with NotAllowed, AR-001.

## How to call

```sh
capxul salary-slip-detail list [--salarySlip <salarySlip>] [--cursor <cursor>]
```

HTTP: `POST /salary-slip-detail/list` with the payload as JSON. SDK: `Sdk.salary-slip-detail.list(payload)`.
