<!-- Generated from the blueprint. Do not edit. -->
# holiday

One day off in a holiday list.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| holidayList | holiday-list.id |
| holidayDate | Day |
| description | HolidayName |

## Machine

States: active. A move from the wrong state is refused HolidayNotActive (exit 40).

| move | from | to | emits |
|---|---|---|---|
| add | (creates) | active | HolidayAdded |

## Invariants

- `holiday.oneHolidayPerDay`: another holiday holds this holiday list and holiday date. Unique on holidayList, holidayDate, in every state; refused HolidayDateTaken.

## Events

- `HolidayAdded`: carries holiday (holiday.id), holidayList (holiday.holidayList), holidayDate (holiday.holidayDate); emitted by the move add

## Operations

- [holiday.add](add.md): Add one day off to a holiday list.
- [holiday.get](get.md): Read one holiday by its id: holidayList, holidayDate, description, state.
