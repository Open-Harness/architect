<!-- Generated from the blueprint. Do not edit. -->
# shift-type.get

Read one shift-type by its id: company, shiftTypeName, startTime, endTime, state.

**Who may call:** the owner of its company.

**A read:** answered from the records, with no handler.

**Budget:** p95 50ms.

## Payload

| field | value |
|---|---|
| id | shift-type.id |

## Answer

| field | value |
|---|---|
| company | shift-type.company |
| shiftTypeName | shift-type.shiftTypeName |
| startTime | shift-type.startTime |
| endTime | shift-type.endTime |
| state | text |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its company; the handler never runs |

## Worked examples

### set up shift types

Starts from the world `three companies`.

- **Bo can't read it.** `bo` (signed in) calls and sends id the last call's shiftType, and is refused with NotAllowed, AR-001.
- **it reads back as she typed it.** `ada` (role company.owner) calls and sends id the last call's shiftType, and gets back [the world's company, `Day`, `09:00`, `17:00`, `active`].
- **it reads back starting at ten and ending at six.** `ada` (role company.owner) calls and sends id the last call's shiftType, and gets back [the world's company, `Night`, `22:00`, `06:00`, `active`].
- **it reads back a minute long.** `ada` (role company.owner) calls and sends id the last call's shiftType, and gets back [`Handover`, `08:00`, `08:01`].
- **it reads back twelve hours long.** `ada` (role company.owner) calls and sends id the last call's shiftType, and gets back [`Twelve`, `08:00`, `20:00`].
- **it reads back ending at midnight.** `ada` (role company.owner) calls and sends id the last call's shiftType, and gets back [`Evening`, `16:00`, `00:00`].
- **it reads back starting at midnight.** `ada` (role company.owner) calls and sends id the last call's shiftType, and gets back [`Graveyard`, `00:00`, `08:00`].
- **it reads back in Acme Logistics with its own times.** `ada` (role company.owner) calls and sends id the last call's shiftType, and gets back [the world's otherCompany, `Day`, `08:00`, `16:30`, `active`].
- **it reads back in Bo Ltd.** `bo` (signed in) calls and sends id the last call's shiftType, and gets back [the world's boCompany, `Day`, `09:00`, `17:00`].

## How to call

```sh
capxul shift-type get --id <id>
```

HTTP: `POST /shift-type/get` with the payload as JSON. SDK: `Sdk.shift-type.get(payload)`.
