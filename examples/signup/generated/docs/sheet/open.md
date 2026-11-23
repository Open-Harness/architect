<!-- Generated from the blueprint. Do not edit. -->
# sheet.open

Put up a sheet with a number of places.

**Who may call:** anyone.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| title | sheet.title |
| places | sheet.places |

## Answer

| field | value |
|---|---|
| sheet | sheet.id |

## Move

`open`: from nothing (it creates) to open, emitting SheetOpened.

## Steps

- `sheet.open.insert` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### put up a sheet

Starts from an empty world.

- **a visitor puts up a sheet with 3 places.** `visitor` (anyone) calls and sends title `Book club`, places `3`, and gets back an answer matching `^sht_`.

## How to call

```sh
signup sheet open --title <title> --places <places>
```

HTTP: `POST /sheet/open` with the payload as JSON. SDK: `Sdk.sheet.open(payload)`.
