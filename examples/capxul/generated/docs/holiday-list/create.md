<!-- Generated from the blueprint. Do not edit. -->
# holiday-list.create

Start a company's list of days off, between two days.

**Who may call:** the owner of its company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| company | holiday-list.company |
| holidayListName | holiday-list.holidayListName |
| fromDate | holiday-list.fromDate |
| toDate | holiday-list.toDate |

## Answer

| field | value |
|---|---|
| holidayList | holiday-list.id |

## Move

`create`: from nothing (it creates) to active, emitting HolidayListCreated.

## Steps

- `holiday-list.create.insert` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| HolidayListEndsBeforeStart | 44 | HL-002 | declared in errors.ts, carrying fromDate |
| HolidayListNameTaken | 43 | HL-001 | another holiday list holds this company and holiday list name; by the rule holiday-list.oneNamePerCompany, carrying holidayListName |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### set up a holiday list

Starts from the world `a company`.

- **Ada starts a list for a year.** `ada` (role company.owner) calls and sends company the world's company, holidayListName `Kenya 2027`, fromDate `2027-01-01`, toDate `2027-12-31`, and gets back an answer matching `^hls_[0-9a-z]+$`.
- **a list can't end before it starts.** `ada` (role company.owner) calls and sends company the world's company, holidayListName `Backwards`, fromDate `2028-01-01`, toDate `2027-12-31`, and is refused with HolidayListEndsBeforeStart, HL-002, carrying fromDate `2028-01-01`.
- **nor end a day before it starts, inside one month.** `ada` (role company.owner) calls and sends company the world's company, holidayListName `Backwards again`, fromDate `2028-08-15`, toDate `2028-08-14`, and is refused with HolidayListEndsBeforeStart, HL-002, carrying fromDate `2028-08-15`.
- **a second list can't take the first one's name.** `ada` (role company.owner) calls and sends company the world's company, holidayListName `Kenya 2027`, fromDate `2028-01-01`, toDate `2028-12-31`, and is refused with HolidayListNameTaken, HL-001, carrying holidayListName `Kenya 2027`.
- **Bo can't start a list in Ada's company.** `bo` (signed in) calls and sends company the world's company, holidayListName `Bo's days`, fromDate `2027-01-01`, toDate `2027-12-31`, and is refused with NotAllowed, AR-001.
- **a list may start and end on the same day.** `ada` (role company.owner) calls and sends company the world's company, holidayListName `Shutdown`, fromDate `2028-08-14`, toDate `2028-08-14`, and gets back an answer matching `^hls_[0-9a-z]+$`.

## How to call

```sh
capxul holiday-list create --company <company> --holidayListName <holidayListName> --fromDate <fromDate> --toDate <toDate>
```

HTTP: `POST /holiday-list/create` with the payload as JSON. SDK: `Sdk.holiday-list.create(payload)`.
