<!-- Generated from the blueprint. Do not edit. -->
# sheet

A sign-up sheet with a fixed number of places.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| title | Title |
| places | Count |
| taken | Count |

## Machine

States: open, full, closed. A move from the wrong state is refused SheetNotOpen (exit 70).

| move | from | to | emits |
|---|---|---|---|
| open | (creates) | open | SheetOpened |
| join | open | open, full | PlaceTaken |
| close | open, full | closed | SheetClosed |

## Events

- `PlaceTaken`: carries sheet (sheet.id), left (Count); emitted by the move join
- `SheetClosed`: carries sheet (sheet.id); emitted by the move close
- `SheetOpened`: carries sheet (sheet.id), places (Count); emitted by the move open

## Operations

- [sheet.close](close.md): Take a sheet down. Nobody can join it after this.
- [sheet.get](get.md): Read one sheet by its id: title, places, taken, state.
- [sheet.join](join.md): Take places on a sheet, for yourself and anyone with you.
- [sheet.open](open.md): Put up a sheet with a number of places.
