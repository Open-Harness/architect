# values

Owns `Blueprint.value`, `id`, `uint`, `text`, `instant` (a moment, ISO 8601 with milliseconds on the wire) `day` (a calendar day, `YYYY-MM-DD`, with no time or zone), `decimal` (an exact `BigDecimal` in code, plain decimal text with no exponent on the wire, at most `places` digits after the point) and `link` (another thing's field, read only when it is used, so two things may take each other's ids), and `Days`, a day's arithmetic (`weekday`, `add`, `between`) done by counting days, never by the clock: the named types a thing's fields are made of.

Invariants: a value is plain data (`{ kind: "value", schema }`) with no name; its name, when it has one, is its export.
Ids are branded by prefix, so an allowance id never type-checks as an organisation id.
A link reads its field only through getters (`internal/link.ts`); copying one by spreading it reads the field at once.

Test: `values.test.ts`, `day.test.ts` and `decimal.test.ts` decode good and bad inputs through each value's schema; `link.test.ts` declares a link before its field exists.
