<!-- Generated from the blueprint. Do not edit. -->
# holiday-list.get

Read one holiday-list by its id: company, holidayListName, fromDate, toDate, totalHolidays, state.

**Who may call:** the owner of its company.

**A read:** answered from the records, with no handler.

**Budget:** p95 50ms.

## Payload

| field | value |
|---|---|
| id | holiday-list.id |

## Answer

| field | value |
|---|---|
| company | holiday-list.company |
| holidayListName | holiday-list.holidayListName |
| fromDate | holiday-list.fromDate |
| toDate | holiday-list.toDate |
| totalHolidays | holiday-list.totalHolidays |
| state | text |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its company; the handler never runs |

## Worked examples

### add holidays

Starts from the world `a holiday list`.

- **the list now counts two holidays.** `ada` (role company.owner) calls and sends id the world's holidayList, and gets back [`Kenya 2027`, `2027-01-01`, `2027-12-31`, `2`].

### set up a holiday list

Starts from the world `a company`.

- **Bo can't read Ada's list.** `bo` (signed in) calls and sends id the last call's holidayList, and is refused with NotAllowed, AR-001.
- **the list reads back as she typed it, with no holidays yet.** `ada` (role company.owner) calls and sends id the last call's holidayList, and gets back [the world's company, `Kenya 2027`, `2027-01-01`, `2027-12-31`, `0`, `active`].
- **that one reads back with its own name and days.** `ada` (role company.owner) calls and sends id the last call's holidayList, and gets back [the world's company, `Shutdown`, `2028-08-14`, `2028-08-14`, `0`, `active`].

### weekly offs

Starts from the world `a sunday holiday`.

- **the list counts every one of them.** `ada` (role company.owner) calls and sends id the world's holidayList, and gets back [`106`, `active`].

## How to call

```sh
capxul holiday-list get --id <id>
```

HTTP: `POST /holiday-list/get` with the payload as JSON. SDK: `Sdk.holiday-list.get(payload)`.
