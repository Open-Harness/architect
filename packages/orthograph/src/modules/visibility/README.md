# visibility

Owns `Blueprint.visibility.secret`, `.private` and `.public`: who may see a field's value. A value and a field both
carry a `visibility`, `public` unless a blueprint says otherwise; `secret` and `private(roles)` are marked in the
blueprint, never guessed from a field's name.

Marking returns a copy of the same kind. A marked field keeps its `of`, `key` and `from`. Public fields may be journalled.
For telemetry, `traceable` also requires an explicit `Blueprint.traced(valueOrField)` mark on public text. Reusing a
marked field in another declaration carries the mark forward.

Test: `visibility.test.ts`.
