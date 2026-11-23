<!-- Generated from the blueprint. Do not edit. -->
# sheet.close

Take a sheet down. Nobody can join it after this.

**Who may call:** anyone.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| sheet | sheet.id |

## Answer

(none)

## Move

`close`: from open or full to closed, emitting SheetClosed.

## Steps

- `sheet.close.record` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| SheetNotOpen | 70 | SH-900 | the sheet is in a state close can't start from; carries `state` |
| SheetNotFound | 4 | SH-901 | nothing has the id in sheet; the handler never runs; carries `id` |

## Worked examples

### a closed sheet takes no one

Starts from the world `opened`.

- **the visitor closes the sheet.** `visitor` (anyone) calls and sends sheet the world's sheet, and is answered.
- **closing it again is refused.** `visitor` (anyone) calls and sends sheet the world's sheet, and is refused with SheetNotOpen, SH-900, carrying state `closed`.

## How to call

```sh
signup sheet close --sheet <sheet>
```

HTTP: `POST /sheet/close` with the payload as JSON. SDK: `Sdk.sheet.close(payload)`.
