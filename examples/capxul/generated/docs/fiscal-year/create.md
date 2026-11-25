<!-- Generated from the blueprint. Do not edit. -->
# fiscal-year.create

Set up a company's fiscal year.

**Who may call:** the owner of its company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

| field | value | description |
|---|---|---|
| company | fiscal-year.company |  |
| year | fiscal-year.year |  |
| yearStartDate | fiscal-year.yearStartDate |  |
| yearEndDate | fiscal-year.yearEndDate |  |
| isShortYear | fiscal-year.isShortYear | A year shorter than twelve months, as some countries allow (ERPNext's `is_short_year`). |

## Answer

| field | value |
|---|---|
| fiscalYear | fiscal-year.id |

## Move

`create`: from nothing (it creates) to active, emitting FiscalYearCreated.

## Steps

- `fiscal-year.create.load` (database)
- `fiscal-year.create.insert` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| FiscalYearEndsBeforeStart | 41 | FY-001 | declared in errors.ts, carrying yearStartDate |
| FiscalYearWrongLength | 42 | FY-002 | declared in errors.ts, carrying yearEndDate |
| FiscalYearOverlaps | 43 | FY-003 | declared in errors.ts, carrying fiscalYear |
| FiscalYearNameTaken | 44 | FY-004 | another fiscal year holds this company and year; by the rule fiscal-year.oneNamePerCompany |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### keep the books

Starts from the world `a chart`.

- **Ada sets up the fiscal year 2026.** `ada` (role company.owner) calls and sends company the world's company, year `2026`, yearStartDate `2026-01-01`, yearEndDate `2026-12-31`, isShortYear false, and gets back an answer matching `^fyr_[0-9a-z]+$`.

### post a journal entry

Starts from the world `a capital entry`.

- **Acme Logistics sets up its own 2027.** `ada` (role company.owner) calls and sends company the world's otherCompany, year `2027`, yearStartDate `2027-01-01`, yearEndDate `2027-12-31`, isShortYear false, and gets back an answer matching `^fyr_`.
- **Acme Trading sets up 2027 too.** `ada` (role company.owner) calls and sends company the world's company, year `2027`, yearStartDate `2027-01-01`, yearEndDate `2027-12-31`, isShortYear false, and gets back an answer matching `^fyr_`.
- **Acme Trading sets up a short year from April 2028 to February 2029, named for neither calendar year.** `ada` (role company.owner) calls and sends company the world's company, year `FY28`, yearStartDate `2028-04-01`, yearEndDate `2029-02-28`, isShortYear true, and gets back an answer matching `^fyr_`.

### set up fiscal years

Starts from the world `a fiscal year`.

- **nor set up a year for Acme Trading.** `bo` (signed in) calls and sends company the world's company, year `2027`, yearStartDate `2027-01-01`, yearEndDate `2027-12-31`, isShortYear false, and is refused with NotAllowed, AR-001.
- **a year that ends the day before it starts is refused.** `ada` (role company.owner) calls and sends company the world's company, year `2027`, yearStartDate `2027-01-01`, yearEndDate `2026-12-31`, isShortYear false, and is refused with FiscalYearEndsBeforeStart, FY-001, carrying yearStartDate `2027-01-01`.
- **a short one too, a month back, which is judged before its length.** `ada` (role company.owner) calls and sends company the world's company, year `2027`, yearStartDate `2027-03-01`, yearEndDate `2027-02-01`, isShortYear true, and is refused with FiscalYearEndsBeforeStart, FY-001, carrying yearStartDate `2027-03-01`.
- **and one that ends before it starts and overlaps 2026 is refused for its ends first.** `ada` (role company.owner) calls and sends company the world's company, year `2027`, yearStartDate `2026-06-01`, yearEndDate `2026-05-31`, isShortYear false, and is refused with FiscalYearEndsBeforeStart, FY-001, carrying yearStartDate `2026-06-01`.
- **a year a day short is refused.** `ada` (role company.owner) calls and sends company the world's company, year `2027`, yearStartDate `2027-01-01`, yearEndDate `2027-12-30`, isShortYear false, and is refused with FiscalYearWrongLength, FY-002, carrying yearEndDate `2027-12-31`.
- **so is a year a day long.** `ada` (role company.owner) calls and sends company the world's company, year `2027`, yearStartDate `2027-01-01`, yearEndDate `2028-01-01`, isShortYear false, and is refused with FiscalYearWrongLength, FY-002, carrying yearEndDate `2027-12-31`.
- **and a year a month short that isn't marked short.** `ada` (role company.owner) calls and sends company the world's company, year `2027`, yearStartDate `2027-04-01`, yearEndDate `2028-02-29`, isShortYear false, and is refused with FiscalYearWrongLength, FY-002, carrying yearEndDate `2028-03-31`.
- **a short year may not run longer than a year.** `ada` (role company.owner) calls and sends company the world's company, year `2027`, yearStartDate `2027-01-01`, yearEndDate `2028-01-01`, isShortYear true, and is refused with FiscalYearWrongLength, FY-002, carrying yearEndDate `2027-12-31`.
- **a year from mid 2025 to mid 2026 is the right length, but shares half of 2026, and names it.** `ada` (role company.owner) calls and sends company the world's company, year `2025-2026`, yearStartDate `2025-07-01`, yearEndDate `2026-06-30`, isShortYear false, and is refused with FiscalYearOverlaps, FY-003, carrying fiscalYear the world's fiscalYear.
- **a year that shares only 2026's last day overlaps it.** `ada` (role company.owner) calls and sends company the world's company, year `2026-2027`, yearStartDate `2026-12-31`, yearEndDate `2027-12-30`, isShortYear false, and is refused with FiscalYearOverlaps, FY-003, carrying fiscalYear the world's fiscalYear.
- **and one that shares only its first day.** `ada` (role company.owner) calls and sends company the world's company, year `2025-2026`, yearStartDate `2025-01-02`, yearEndDate `2026-01-01`, isShortYear false, and is refused with FiscalYearOverlaps, FY-003, carrying fiscalYear the world's fiscalYear.
- **a year of the wrong length that overlaps is refused for its length first.** `ada` (role company.owner) calls and sends company the world's company, year `2026b`, yearStartDate `2026-03-01`, yearEndDate `2027-03-01`, isShortYear false, and is refused with FiscalYearWrongLength, FY-002, carrying yearEndDate `2027-02-28`.
- **Ada sets up 2025, the year before, which touches 2026 without sharing a day.** `ada` (role company.owner) calls and sends company the world's company, year `2025`, yearStartDate `2025-01-01`, yearEndDate `2025-12-31`, isShortYear false, and gets back an answer matching `^fyr_[0-9a-z]+$`.
- **a year from mid 2025 to mid 2026 now shares days with both, and names 2025, which starts first.** `ada` (role company.owner) calls and sends company the world's company, year `2025-2026`, yearStartDate `2025-07-01`, yearEndDate `2026-06-30`, isShortYear false, and is refused with FiscalYearOverlaps, FY-003, carrying fiscalYear the last call's fiscalYear.
- **a new year may not take 2026's name.** `ada` (role company.owner) calls and sends company the world's company, year `2026`, yearStartDate `2027-01-01`, yearEndDate `2027-12-31`, isShortYear false, and is refused with FiscalYearNameTaken, FY-004.
- **and an overlapping one under 2026's name is refused for the overlap first.** `ada` (role company.owner) calls and sends company the world's company, year `2026`, yearStartDate `2026-02-01`, yearEndDate `2027-01-31`, isShortYear false, and is refused with FiscalYearOverlaps, FY-003, carrying fiscalYear the world's fiscalYear.
- **a short year of six months is allowed.** `ada` (role company.owner) calls and sends company the world's company, year `2027 H1`, yearStartDate `2027-01-01`, yearEndDate `2027-06-30`, isShortYear true, and gets back an answer matching `^fyr_`.
- **so is a short year of one day.** `ada` (role company.owner) calls and sends company the world's company, year `Q3 day one`, yearStartDate `2027-07-01`, yearEndDate `2027-07-01`, isShortYear true, and gets back an answer matching `^fyr_`.
- **a short year is still judged for overlaps: one from June shares a day with the first half.** `ada` (role company.owner) calls and sends company the world's company, year `2027 H2`, yearStartDate `2027-06-30`, yearEndDate `2027-12-31`, isShortYear true, and is refused with FiscalYearOverlaps, FY-003.
- **a short year inside 2026, April to June, overlaps it.** `ada` (role company.owner) calls and sends company the world's company, year `2026 Q2`, yearStartDate `2026-04-01`, yearEndDate `2026-06-30`, isShortYear true, and is refused with FiscalYearOverlaps, FY-003, carrying fiscalYear the world's fiscalYear.
- **a short quarter far ahead, January to March 2045, is allowed.** `ada` (role company.owner) calls and sends company the world's company, year `2045 Q1`, yearStartDate `2045-01-01`, yearEndDate `2045-03-31`, isShortYear true, and gets back an answer matching `^fyr_`.
- **a full year from December 2044 that holds that quarter whole overlaps it.** `ada` (role company.owner) calls and sends company the world's company, year `2044-2045`, yearStartDate `2044-12-01`, yearEndDate `2045-11-30`, isShortYear false, and is refused with FiscalYearOverlaps, FY-003, carrying fiscalYear the last call's fiscalYear.
- **a short year may run the whole year: it ends no later, so 2050 marked short is allowed.** `ada` (role company.owner) calls and sends company the world's company, year `2050`, yearStartDate `2050-01-01`, yearEndDate `2050-12-31`, isShortYear true, and gets back an answer matching `^fyr_`.
- **a year from 28 February 2035 ends on 27 February 2036, though 2036 has a leap day.** `ada` (role company.owner) calls and sends company the world's company, year `2035-2036`, yearStartDate `2035-02-28`, yearEndDate `2036-02-28`, isShortYear false, and is refused with FiscalYearWrongLength, FY-002, carrying yearEndDate `2036-02-27`.
- **a full year may end on a leap day: 1 March 2031 to 29 February 2032.** `ada` (role company.owner) calls and sends company the world's company, year `2031-2032`, yearStartDate `2031-03-01`, yearEndDate `2032-02-29`, isShortYear false, and gets back an answer matching `^fyr_`.
- **from 1 March 2032, with no leap day to come, a year ends on 28 February 2033.** `ada` (role company.owner) calls and sends company the world's company, year `2032-2033`, yearStartDate `2032-03-01`, yearEndDate `2033-02-28`, isShortYear false, and gets back an answer matching `^fyr_`.
- **a year from a leap day ends on 27 February, not the 28th.** `ada` (role company.owner) calls and sends company the world's company, year `2036-2037`, yearStartDate `2036-02-29`, yearEndDate `2037-02-28`, isShortYear false, and is refused with FiscalYearWrongLength, FY-002, carrying yearEndDate `2037-02-27`.
- **on the 27th it is allowed.** `ada` (role company.owner) calls and sends company the world's company, year `2036-2037`, yearStartDate `2036-02-29`, yearEndDate `2037-02-27`, isShortYear false, and gets back an answer matching `^fyr_`.
- **a year from 1 March 2039 ends on 29 February 2040, and the 28th is refused.** `ada` (role company.owner) calls and sends company the world's company, year `2039-2040`, yearStartDate `2039-03-01`, yearEndDate `2040-02-28`, isShortYear false, and is refused with FiscalYearWrongLength, FY-002, carrying yearEndDate `2040-02-29`.
- **Acme Logistics may keep its own 2026, on the same days, under the same name.** `ada` (role company.owner) calls and sends company the world's otherCompany, year `2026`, yearStartDate `2026-01-01`, yearEndDate `2026-12-31`, isShortYear false, and gets back an answer matching `^fyr_`.

## How to call

```sh
capxul fiscal-year create --company <company> --year <year> --yearStartDate <yearStartDate> --yearEndDate <yearEndDate> --isShortYear <isShortYear>
```

HTTP: `POST /fiscal-year/create` with the payload as JSON. SDK: `Sdk.fiscal-year.create(payload)`.
