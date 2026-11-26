<!-- Generated from the blueprint. Do not edit. -->
# salary-slip.list

List salary-slips, oldest first, 100 to a page, filtered by employee, payrollEntry.

**Who may call:** the self of its employee, or the owner of its employee.company.

**A read:** answered from the records, with no handler. A page of 100 at a time, oldest first, narrowed by employee, payrollEntry; pass the answer's `next` as `cursor` for the page after it.

**Budget:** p95 80ms.

## Payload

| field | value |
|---|---|
| employee (optional) | salary-slip.employee |
| payrollEntry (optional) | salary-slip.payrollEntry |
| cursor (optional) | text |

## Answer

| field | value |
|---|---|
| items | schema |
| next | schema |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the self of its employee, or the owner of its employee.company; the handler never runs |

## Worked examples

### pay a month

Starts from the world `a pension component`.

- **Cy's slip pays March's 3,350 USDC net, a draft.** `ada` (role company.owner) calls and sends employee the world's secondEmployee, and gets back [[the world's company, the world's secondEmployee, `2026-03-31`, `2026-03-01`, `2026-03-31`, `3500000000`, `150000000`, `3350000000`, `Draft`]].
- **Olga's slip the same.** `ada` (role company.owner) calls and sends employee the world's employee, and gets back [[the world's company, the world's employee, `2026-03-31`, `2026-03-01`, `2026-03-31`, `3500000000`, `150000000`, `3350000000`, `Draft`]].
- **Olga's slip is submitted now.** `ada` (role company.owner) calls and sends employee the world's employee, and gets back [[the world's company, the world's employee, `2026-03-31`, `2026-03-01`, `2026-03-31`, `3500000000`, `150000000`, `3350000000`, `Submitted`]].
- **Cy's slip names it too.** `ada` (role company.owner) calls and sends employee the world's secondEmployee, and gets back [[the world's company, the world's secondEmployee, `2026-03-31`, `2026-03-01`, `2026-03-31`, `3500000000`, `150000000`, `3350000000`, `Submitted`]].

### run a payroll

Starts from the world `an outside cost center`.

- **Olga's February slip: her structure in full, a draft.** `ada` (role company.owner) calls and sends employee the world's employee, payrollEntry the last call's payrollEntry, and gets back [[the world's company, the world's employee, `2026-02-28`, `2026-02-01`, `2026-02-28`, `3500000000`, `150000000`, `3350000000`, `Draft`]].
- **Olga lists her own slips.** `olga` (signed in) calls and sends employee the world's employee, and gets back 1.
- **Cy can't list Olga's.** `cy` (signed in) calls and sends employee the world's employee, and is refused with NotAllowed, AR-001.
- **Olga's slip is submitted now.** `ada` (role company.owner) calls and sends employee the world's employee, and gets back [[the world's company, the world's employee, `2026-02-28`, `2026-02-01`, `2026-02-28`, `3500000000`, `150000000`, `3350000000`, `Submitted`]].
- **Cy's March slip: her structure in full, a draft.** `ada` (role company.owner) calls and sends employee the world's secondEmployee, payrollEntry the last call's payrollEntry, and gets back [[the world's company, the world's secondEmployee, `2026-03-31`, `2026-03-01`, `2026-03-31`, `3500000000`, `150000000`, `3350000000`, `Draft`]].
- **Cy lists her own: that slip alone.** `cy` (signed in) calls and sends employee the world's secondEmployee, and gets back 1.
- **Olga's April slip is paid by the seniors' structure, her latest assignment.** `ada` (role company.owner) calls and sends employee the world's employee, payrollEntry the last call's payrollEntry, and gets back [[the world's company, the world's employee, `2026-04-30`, `2026-04-01`, `2026-04-30`, `5000000000`, `0`, `5000000000`, `Draft`]].
- **Cy's by the engineers' structure, though she has left.** `ada` (role company.owner) calls and sends employee the world's secondEmployee, payrollEntry the last call's items 0 payrollEntry, and gets back [[the world's company, the world's secondEmployee, `2026-04-30`, `2026-04-01`, `2026-04-30`, `3500000000`, `150000000`, `3350000000`, `Draft`]].
- **booking April's slips left E's March slip for Cy a draft: only the entry's own slips are submitted.** `ada` (role company.owner) calls and sends employee the world's secondEmployee, and gets back [[`2026-03-01`, `Draft`], [`2026-04-01`, `Submitted`]].
- **and Olga's May slip a draft, after her three submitted ones.** `ada` (role company.owner) calls and sends employee the world's employee, and gets back [[`2026-02-01`, `2026-02-28`, `Submitted`], [`2026-03-01`, `2026-03-31`, `Submitted`], [`2026-04-01`, `2026-04-30`, `Submitted`], [`2026-05-01`, `2027-01-04`, `Draft`]].
- **Dee's slips run over the entries' days, April's from the 1st though she joined on the 8th.** `ada` (role company.owner) calls and sends employee the last call's items 1 employee, and gets back [[`2026-04-01`, `2026-04-30`], [`2026-05-01`, `2026-05-31`]].
- **Olga's October slip pays the seniors' structure: the latest day among submitted assignments, not the latest made.** `ada` (role company.owner) calls and sends employee the world's employee, payrollEntry the last call's payrollEntry, and gets back [[the world's company, the world's employee, `2026-10-31`, `2026-10-01`, `2026-10-31`, `5000000000`, `0`, `5000000000`, `Draft`]].

## How to call

```sh
capxul salary-slip list [--employee <employee>] [--payrollEntry <payrollEntry>] [--cursor <cursor>]
```

HTTP: `POST /salary-slip/list` with the payload as JSON. SDK: `Sdk.salary-slip.list(payload)`.
