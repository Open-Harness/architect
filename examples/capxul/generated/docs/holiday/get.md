<!-- Generated from the blueprint. Do not edit. -->
# holiday.get

Read one holiday by its id: holidayList, holidayDate, description, state.

**Who may call:** the owner of its holidayList.company.

**A read:** answered from the records, with no handler.

**Budget:** p95 50ms.

## Payload

| field | value |
|---|---|
| id | holiday.id |

## Answer

| field | value |
|---|---|
| holidayList | holiday.holidayList |
| holidayDate | holiday.holidayDate |
| description | holiday.description |
| state | text |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its holidayList.company; the handler never runs |

## Worked examples

### add holidays

Starts from the world `a holiday list`.

- **Bo can't read the new holiday.** `bo` (signed in) calls and sends id the last call's holiday, and is refused with NotAllowed, AR-001.
- **the holiday reads back as she typed it.** `ada` (role company.owner) calls and sends id the last call's holiday, and gets back [the world's holidayList, `2027-01-01`, `New Year's Day`, `active`].
- **that one reads back with its own day and name.** `ada` (role company.owner) calls and sends id the last call's holiday, and gets back [the world's holidayList, `2027-12-31`, `New Year's Eve`].

### weekly offs

Starts from the world `a sunday holiday`.

- **the day it held keeps its own name.** `ada` (role company.owner) calls and sends id the world's holiday, and gets back [`2027-01-03`, `Founders' Day`].

## How to call

```sh
capxul holiday get --id <id>
```

HTTP: `POST /holiday/get` with the payload as JSON. SDK: `Sdk.holiday.get(payload)`.
