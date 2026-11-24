<!-- Generated from the blueprint. Do not edit. -->
# holiday.add

Add one day off to a holiday list.

**Who may call:** the owner of its holidayList.company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 200ms.

## Payload

| field | value |
|---|---|
| holidayList | holiday.holidayList |
| holidayDate | holiday.holidayDate |
| description | holiday.description |

## Answer

| field | value |
|---|---|
| holiday | holiday.id |
| totalHolidays | HolidayCount |

## Move

`add`: from nothing (it creates) to active, emitting HolidayAdded.

## Steps

- `holiday.add.load` (database)
- `holiday.add.insert` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| HolidayOutsideList | 42 | HD-002 | declared in errors.ts, carrying fromDate, toDate |
| HolidayDateTaken | 41 | HD-001 | another holiday holds this holiday list and holiday date; by the rule holiday.oneHolidayPerDay, carrying holidayDate |
| HolidayListNameTaken | 43 | HL-001 | another holiday list holds this company and holiday list name; by the rule holiday-list.oneNamePerCompany, carrying holidayListName |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its holidayList.company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### a one-day list

Starts from the world `a one-day list`.

- **the day before its only day is outside it.** `ada` (role company.owner) calls and sends holidayList the world's holidayList, holidayDate `2028-08-13`, description `Too early`, and is refused with HolidayOutsideList, HD-002, carrying fromDate `2028-08-14`, toDate `2028-08-14`.
- **so is the day after.** `ada` (role company.owner) calls and sends holidayList the world's holidayList, holidayDate `2028-08-15`, description `Too late`, and is refused with HolidayOutsideList, HD-002, carrying fromDate `2028-08-14`, toDate `2028-08-14`.
- **that day is then taken.** `ada` (role company.owner) calls and sends holidayList the world's holidayList, holidayDate `2028-08-14`, description `Picnic`, and is refused with HolidayDateTaken, HD-001, carrying holidayDate `2028-08-14`.

### add holidays

Starts from the world `a holiday list`.

- **Ada adds the list's first day.** `ada` (role company.owner) calls and sends holidayList the world's holidayList, holidayDate `2027-01-01`, description `New Year's Day`, and gets back [`1`] and gets back an answer matching `^hol_[0-9a-z]+$`.
- **the same day can't be added twice.** `ada` (role company.owner) calls and sends holidayList the world's holidayList, holidayDate `2027-01-01`, description `Again`, and is refused with HolidayDateTaken, HD-001, carrying holidayDate `2027-01-01`.
- **a day before the list starts is refused.** `ada` (role company.owner) calls and sends holidayList the world's holidayList, holidayDate `2026-12-31`, description `Too early`, and is refused with HolidayOutsideList, HD-002, carrying fromDate `2027-01-01`, toDate `2027-12-31`.
- **so is a day after it ends.** `ada` (role company.owner) calls and sends holidayList the world's holidayList, holidayDate `2028-01-01`, description `Too late`, and is refused with HolidayOutsideList, HD-002, carrying fromDate `2027-01-01`, toDate `2027-12-31`.
- **Bo can't add a day to Ada's list.** `bo` (signed in) calls and sends holidayList the world's holidayList, holidayDate `2027-05-01`, description `Bo's day`, and is refused with NotAllowed, AR-001.
- **the list's last day may be a holiday too.** `ada` (role company.owner) calls and sends holidayList the world's holidayList, holidayDate `2027-12-31`, description `New Year's Eve`, and gets back [`2`].

### every weekday

Starts from the world `a leap fortnight`.

- **the leap day is then taken.** `ada` (role company.owner) calls and sends holidayList the world's holidayList, holidayDate `2028-02-29`, description `Picnic`, and is refused with HolidayDateTaken, HD-001, carrying holidayDate `2028-02-29`.
- **the first of March is then taken.** `ada` (role company.owner) calls and sends holidayList the world's holidayList, holidayDate `2028-03-01`, description `Picnic`, and is refused with HolidayDateTaken, HD-001, carrying holidayDate `2028-03-01`.
- **the second of March is then taken.** `ada` (role company.owner) calls and sends holidayList the world's holidayList, holidayDate `2028-03-02`, description `Picnic`, and is refused with HolidayDateTaken, HD-001, carrying holidayDate `2028-03-02`.
- **the fourth of March is then taken.** `ada` (role company.owner) calls and sends holidayList the world's holidayList, holidayDate `2028-03-04`, description `Picnic`, and is refused with HolidayDateTaken, HD-001, carrying holidayDate `2028-03-04`.

### weekly offs

Starts from the world `a sunday holiday`.

- **a day in the middle of the year is now taken.** `ada` (role company.owner) calls and sends holidayList the world's holidayList, holidayDate `2027-06-13`, description `Picnic`, and is refused with HolidayDateTaken, HD-001, carrying holidayDate `2027-06-13`.
- **and so is the last one of the year.** `ada` (role company.owner) calls and sends holidayList the world's holidayList, holidayDate `2027-12-26`, description `Picnic`, and is refused with HolidayDateTaken, HD-001, carrying holidayDate `2027-12-26`.
- **the first day is taken.** `ada` (role company.owner) calls and sends holidayList the world's holidayList, holidayDate `2027-01-01`, description `Picnic`, and is refused with HolidayDateTaken, HD-001, carrying holidayDate `2027-01-01`.
- **and so is the last.** `ada` (role company.owner) calls and sends holidayList the world's holidayList, holidayDate `2027-12-31`, description `Picnic`, and is refused with HolidayDateTaken, HD-001, carrying holidayDate `2027-12-31`.
- **a day of another weekday may still be added.** `ada` (role company.owner) calls and sends holidayList the world's holidayList, holidayDate `2027-01-04`, description `Picnic`, and gets back [`106`].

## How to call

```sh
capxul holiday add --holidayList <holidayList> --holidayDate <holidayDate> --description <description>
```

HTTP: `POST /holiday/add` with the payload as JSON. SDK: `Sdk.holiday.add(payload)`.
