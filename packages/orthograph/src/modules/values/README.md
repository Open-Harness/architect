# values

Owns `Blueprint.value`, `id`, `uint`, `text` and `instant` (a moment, ISO 8601 with milliseconds on the wire): the named types a thing's fields are made of.

Invariants: a value is plain data (`{ kind: "value", schema }`) with no name; its name, when it has one, is its export.
Ids are branded by prefix, so an allowance id never type-checks as an organisation id.

Test: `values.test.ts` decodes good and bad inputs through each value's schema.
