<!-- Generated from the blueprint. Do not edit. -->
# holiday-list

The days a company doesn't work, between two days.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| company | company.id |
| holidayListName | Name |
| fromDate | Day |
| toDate | Day |
| totalHolidays | HolidayCount |

## Machine

States: active. A move from the wrong state is refused HolidayListNotActive (exit 40).

| move | from | to | emits |
|---|---|---|---|
| create | (creates) | active | HolidayListCreated |
| addWeeklyOff | active | active | WeeklyOffAdded |

## Invariants

- `holiday-list.oneNamePerCompany`: another holiday list holds this company and holiday list name. Unique on company, holidayListName, in every state; refused HolidayListNameTaken.

## Events

- `HolidayListCreated`: carries holidayList (holiday-list.id), company (holiday-list.company); emitted by the move create
- `WeeklyOffAdded`: carries holidayList (holiday-list.id), weekday (Weekday), added (HolidayCount), totalHolidays (HolidayCount); emitted by the move addWeeklyOff

## Operations

- [holiday-list.add-weekly-off](add-weekly-off.md): Make every given weekday in a holiday list a day off.
- [holiday-list.create](create.md): Start a company's list of days off, between two days.
- [holiday-list.get](get.md): Read one holiday-list by its id: company, holidayListName, fromDate, toDate, totalHolidays, state.
