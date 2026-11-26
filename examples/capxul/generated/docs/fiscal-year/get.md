<!-- Generated from the blueprint. Do not edit. -->
# fiscal-year.get

Read one fiscal-year by its id: company, year, yearStartDate, yearEndDate, isShortYear, state.

**Who may call:** the owner of its company.

**A read:** answered from the records, with no handler.

**Budget:** p95 50ms.

## Payload

| field | value |
|---|---|
| id | fiscal-year.id |

## Answer

| field | value | description |
|---|---|---|
| company | fiscal-year.company |  |
| year | fiscal-year.year |  |
| yearStartDate | fiscal-year.yearStartDate |  |
| yearEndDate | fiscal-year.yearEndDate |  |
| isShortYear | fiscal-year.isShortYear | A year shorter than twelve months, as some countries allow (ERPNext's `is_short_year`). |
| state | text |  |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its company; the handler never runs |

## Worked examples

### set up fiscal years

Starts from the world `a fiscal year`.

- **the year 2026 reads back as Ada set it up.** `ada` (role company.owner) calls and sends id the world's fiscalYear, and gets back [the world's company, `2026`, `2026-01-01`, `2026-12-31`, false, `active`].
- **Bo can't read it.** `bo` (signed in) calls and sends id the world's fiscalYear, and is refused with NotAllowed, AR-001.
- **it reads back as she typed it.** `ada` (role company.owner) calls and sends id the last call's fiscalYear, and gets back [the world's company, `2025`, `2025-01-01`, `2025-12-31`, false, `active`].
- **it reads back short.** `ada` (role company.owner) calls and sends id the last call's fiscalYear, and gets back [`2027 H1`, `2027-01-01`, `2027-06-30`, true].
- **and it is Acme Logistics'.** `ada` (role company.owner) calls and sends id the last call's fiscalYear, and gets back [the world's otherCompany, `2026`, `2026-01-01`, `2026-12-31`].
- **Acme Trading's 2026 is unchanged.** `ada` (role company.owner) calls and sends id the world's fiscalYear, and gets back [the world's company, `2026`, `2026-01-01`, `2026-12-31`, false].

## How to call

```sh
capxul fiscal-year get --id <id>
```

HTTP: `POST /fiscal-year/get` with the payload as JSON. SDK: `Sdk.fiscal-year.get(payload)`.
