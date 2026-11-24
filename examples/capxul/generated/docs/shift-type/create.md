<!-- Generated from the blueprint. Do not edit. -->
# shift-type.create

Add a working shift to a company, from its start time to its end time.

**Who may call:** the owner of its company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| company | shift-type.company |
| shiftTypeName | shift-type.shiftTypeName |
| startTime | shift-type.startTime |
| endTime | shift-type.endTime |

## Answer

| field | value |
|---|---|
| shiftType | shift-type.id |

## Move

`create`: from nothing (it creates) to active, emitting ShiftTypeCreated.

## Steps

- `shift-type.create.insert` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| ShiftStartsWhenItEnds | 42 | SH-002 | declared in errors.ts |
| ShiftTypeNameTaken | 41 | SH-001 | another shift type holds this company and shift type name; by the rule shift-type.oneNamePerCompany, carrying shiftTypeName |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### set up shift types

Starts from the world `three companies`.

- **Ada adds a day shift, nine to five.** `ada` (role company.owner) calls and sends company the world's company, shiftTypeName `Day`, startTime `09:00`, endTime `17:00`, and gets back an answer matching `^sht_[0-9a-z]+$`.
- **a night shift may end the morning after it starts.** `ada` (role company.owner) calls and sends company the world's company, shiftTypeName `Night`, startTime `22:00`, endTime `06:00`, and gets back an answer matching `^sht_[0-9a-z]+$`.
- **a shift can't start when it ends.** `ada` (role company.owner) calls and sends company the world's company, shiftTypeName `Nothing`, startTime `08:00`, endTime `08:00`, and is refused with ShiftStartsWhenItEnds, SH-002.
- **nor at midnight, when it ends at midnight.** `ada` (role company.owner) calls and sends company the world's company, shiftTypeName `Midnight`, startTime `00:00`, endTime `00:00`, and is refused with ShiftStartsWhenItEnds, SH-002.
- **a name already taken, with the same start and end, is refused for its times first.** `ada` (role company.owner) calls and sends company the world's company, shiftTypeName `Day`, startTime `07:30`, endTime `07:30`, and is refused with ShiftStartsWhenItEnds, SH-002.
- **a shift one minute long is allowed.** `ada` (role company.owner) calls and sends company the world's company, shiftTypeName `Handover`, startTime `08:00`, endTime `08:01`, and gets back an answer matching `^sht_[0-9a-z]+$`.
- **a shift exactly twelve hours long is allowed, eight in the morning to eight at night.** `ada` (role company.owner) calls and sends company the world's company, shiftTypeName `Twelve`, startTime `08:00`, endTime `20:00`, and gets back an answer matching `^sht_[0-9a-z]+$`.
- **an evening shift may end at midnight.** `ada` (role company.owner) calls and sends company the world's company, shiftTypeName `Evening`, startTime `16:00`, endTime `00:00`, and gets back an answer matching `^sht_[0-9a-z]+$`.
- **a graveyard shift may start at midnight.** `ada` (role company.owner) calls and sends company the world's company, shiftTypeName `Graveyard`, startTime `00:00`, endTime `08:00`, and gets back an answer matching `^sht_[0-9a-z]+$`.
- **a sixteen-hour shift is allowed.** `ada` (role company.owner) calls and sends company the world's company, shiftTypeName `Sixteen`, startTime `06:00`, endTime `22:00`, and gets back an answer matching `^sht_[0-9a-z]+$`.
- **and a fourteen-hour shift overnight.** `ada` (role company.owner) calls and sends company the world's company, shiftTypeName `Overnight`, startTime `18:00`, endTime `08:00`, and gets back an answer matching `^sht_[0-9a-z]+$`.
- **Day can't be added to Acme Trading twice.** `ada` (role company.owner) calls and sends company the world's company, shiftTypeName `Day`, startTime `08:00`, endTime `16:00`, and is refused with ShiftTypeNameTaken, SH-001, carrying shiftTypeName `Day`.
- **Bo can't add a shift to Ada's company.** `bo` (signed in) calls and sends company the world's company, shiftTypeName `Early`, startTime `06:00`, endTime `14:00`, and is refused with NotAllowed, AR-001.
- **Acme Logistics may have a Day shift of its own, with other times.** `ada` (role company.owner) calls and sends company the world's otherCompany, shiftTypeName `Day`, startTime `08:00`, endTime `16:30`, and gets back an answer matching `^sht_[0-9a-z]+$`.
- **Bo adds a Day shift to Bo Ltd.** `bo` (signed in) calls and sends company the world's boCompany, shiftTypeName `Day`, startTime `09:00`, endTime `17:00`, and gets back an answer matching `^sht_[0-9a-z]+$`.

## How to call

```sh
capxul shift-type create --company <company> --shiftTypeName <shiftTypeName> --startTime <startTime> --endTime <endTime>
```

HTTP: `POST /shift-type/create` with the payload as JSON. SDK: `Sdk.shift-type.create(payload)`.
