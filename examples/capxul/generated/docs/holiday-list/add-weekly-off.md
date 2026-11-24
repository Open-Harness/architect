<!-- Generated from the blueprint. Do not edit. -->
# holiday-list.add-weekly-off

Make every given weekday in a holiday list a day off.

**Who may call:** the owner of its holidayList.company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 300ms.

## Payload

| field | value |
|---|---|
| holidayList | holiday-list.id |
| weekday | Weekday |

## Answer

| field | value |
|---|---|
| holidayList | holiday-list.id |
| weekday | Weekday |
| added | HolidayCount |
| totalHolidays | HolidayCount |

## Move

`addWeeklyOff`: from active to active, emitting WeeklyOffAdded.

## Steps

- `holiday-list.add-weekly-off.load` (database)
- `holiday-list.add-weekly-off.record` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| HolidayDateTaken | 41 | HD-001 | another holiday holds this holiday list and holiday date; by the rule holiday.oneHolidayPerDay, carrying holidayDate |
| HolidayListNameTaken | 43 | HL-001 | another holiday list holds this company and holiday list name; by the rule holiday-list.oneNamePerCompany, carrying holidayListName |
| HolidayListNotActive | 40 | HL-900 | the holiday-list is in a state addWeeklyOff can't start from; carries `state` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its holidayList.company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### a one-day list

Starts from the world `a one-day list`.

- **a weekday the list doesn't hold adds nothing.** `ada` (role company.owner) calls and sends holidayList the world's holidayList, weekday `Sunday`, and gets back [`0`, `0`].
- **its own weekday adds its one day.** `ada` (role company.owner) calls and sends holidayList the world's holidayList, weekday `Monday`, and gets back [`1`, `1`].

### every weekday

Starts from the world `a leap fortnight`.

- **the weekday the list starts and ends on adds three, the leap day among them.** `ada` (role company.owner) calls and sends holidayList the world's holidayList, weekday `Tuesday`, and gets back [`3`, `3`].
- **the day after it adds two.** `ada` (role company.owner) calls and sends holidayList the world's holidayList, weekday `Wednesday`, and gets back [`2`, `5`].
- **the third weekday adds two.** `ada` (role company.owner) calls and sends holidayList the world's holidayList, weekday `Thursday`, and gets back [`2`, `7`].
- **the fourth weekday adds two.** `ada` (role company.owner) calls and sends holidayList the world's holidayList, weekday `Friday`, and gets back [`2`, `9`].
- **the fifth weekday adds two.** `ada` (role company.owner) calls and sends holidayList the world's holidayList, weekday `Saturday`, and gets back [`2`, `11`].
- **the sixth weekday adds two.** `ada` (role company.owner) calls and sends holidayList the world's holidayList, weekday `Sunday`, and gets back [`2`, `13`].
- **the last weekday adds two.** `ada` (role company.owner) calls and sends holidayList the world's holidayList, weekday `Monday`, and gets back [`2`, `15`].

### weekly offs

Starts from the world `a sunday holiday`.

- **Bo can't add a weekly off to Ada's list.** `bo` (signed in) calls and sends holidayList the world's holidayList, weekday `Sunday`, and is refused with NotAllowed, AR-001.
- **Ada makes a weekday a day off, and the day the list already held is skipped.** `ada` (role company.owner) calls and sends holidayList the world's holidayList, weekday `Sunday`, and gets back [the world's holidayList, `Sunday`, `51`, `52`].
- **a weekday that falls on both the first and the last day counts both.** `ada` (role company.owner) calls and sends holidayList the world's holidayList, weekday `Friday`, and gets back [`Friday`, `53`, `105`].
- **asking for the same weekday again adds nothing.** `ada` (role company.owner) calls and sends holidayList the world's holidayList, weekday `Friday`, and gets back [`0`, `105`].

## How to call

```sh
capxul holiday-list add-weekly-off --holidayList <holidayList> --weekday <weekday>
```

HTTP: `POST /holiday-list/add-weekly-off` with the payload as JSON. SDK: `Sdk.holiday-list.add-weekly-off(payload)`.
