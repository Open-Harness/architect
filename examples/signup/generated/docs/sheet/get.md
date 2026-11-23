<!-- Generated from the blueprint. Do not edit. -->
# sheet.get

Read one sheet by its id: title, places, taken, state.

**Who may call:** anyone.

**A read:** answered from the records, with no handler.

**Budget:** p95 50ms.

## Payload

| field | value |
|---|---|
| id | sheet.id |

## Answer

| field | value |
|---|---|
| title | sheet.title |
| places | sheet.places |
| taken | sheet.taken |
| state | text |

## Refusals

(none)

## Worked examples

### a closed sheet takes no one

Starts from the world `opened`.

- **reading it back shows a closed sheet with nobody on it.** `visitor` (anyone) calls and sends id the world's sheet, and gets back [`0`, `closed`].

### fill a sheet

Starts from the world `opened`.

- **reading it back shows both places taken.** `visitor` (anyone) calls and sends id the world's sheet, and gets back [`2`, `2`, `full`].

### join twice with one request

Starts from the world `opened`.

- **only one place was taken.** `visitor` (anyone) calls and sends id the world's sheet, and gets back [`1`, `open`].

### put up a sheet

Starts from an empty world.

- **reading it back shows an open sheet with nobody on it.** `visitor` (anyone) calls and sends id the last call's sheet, and gets back [`Book club`, `3`, `0`, `open`].

## How to call

```sh
signup sheet get --id <id>
```

HTTP: `POST /sheet/get` with the payload as JSON. SDK: `Sdk.sheet.get(payload)`.
