<!-- Generated from the blueprint. Do not edit. -->
# sheet.join

Take places on a sheet, for yourself and anyone with you.

**Who may call:** anyone.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| sheet | sheet.id |
| people | Count |

## Answer

| field | value |
|---|---|
| left | Count |

## Move

`join`: from open to open or full, emitting PlaceTaken.

## Steps

- `sheet.join.load` (database)
- `sheet.join.record` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| SheetFull | 71 | SH-001 | declared in errors.ts, carrying left |
| SheetNotOpen | 70 | SH-900 | the sheet is in a state join can't start from; carries `state` |
| SheetNotFound | 4 | SH-901 | nothing has the id in sheet; the handler never runs; carries `id` |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### a closed sheet takes no one

Starts from the world `opened`.

- **joining it is refused.** `visitor` (anyone) calls and sends sheet the world's sheet, people `1`, with the request key `late-1`, and is refused with SheetNotOpen, SH-900, carrying state `closed`.

### fill a sheet

Starts from the world `opened`.

- **the first join leaves one place and the sheet stays open.** `visitor` (anyone) calls and sends sheet the world's sheet, people `1`, with the request key `join-1`, and gets back `1`.
- **two people are refused: only one place is left.** `visitor` (anyone) calls and sends sheet the world's sheet, people `2`, with the request key `join-2-people`, and is refused with SheetFull, SH-001, carrying left `1`.
- **the second join takes the last place and the sheet is full.** `visitor` (anyone) calls and sends sheet the world's sheet, people `1`, with the request key `join-3`, and gets back `0`.
- **a third join is refused: a full sheet is not open.** `visitor` (anyone) calls and sends sheet the world's sheet, people `1`, with the request key `join-4`, and is refused with SheetNotOpen, SH-900, carrying state `full`.

### join twice with one request

Starts from the world `opened`.

- **the visitor joins.** `visitor` (anyone) calls and sends sheet the world's sheet, people `1`, with the request key `me-1`, and gets back `1`.
- **the same request again gives the same answer and takes nothing.** `visitor` (anyone) calls and sends sheet the world's sheet, people `1`, with the request key `me-1`, and gets back `1`.

## How to call

```sh
signup sheet join --sheet <sheet> --people <people>
```

HTTP: `POST /sheet/join` with the payload as JSON. SDK: `Sdk.sheet.join(payload)`.
