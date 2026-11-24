# values

Owns `Blueprint.value`, `id`, `uint`, `text`, `instant` (a moment, ISO 8601 with milliseconds on the wire) and `day` (a calendar day, `YYYY-MM-DD`, with no time or zone), and `Days`, a day's arithmetic (`weekday`, `add`, `between`) done by counting days, never by the clock: the named types a thing's fields are made of.

Invariants: a value is plain data (`{ kind: "value", schema }`) with no name; its name, when it has one, is its export.
Ids are branded by prefix, so an allowance id never type-checks as an organisation id.

Test: `values.test.ts` and `day.test.ts` decode good and bad inputs through each value's schema.
