# time

Owns what a blueprint declares about time (K23, M8-checks): `Blueprint.time.every` and `Blueprint.time.after`, the `by`
of a move made by time; and `Blueprint.clock.real`, `.stepped` and `.scaled`, the `clock` of an environment. Both are plain
frozen data, with no behaviour: the compiler checks them against the thing's fields and the tz database and writes them
into the model (`moves.<m>.by`, `environments.<e>.clock`), and the keeper and the world's clock, which come later (M8.07,
M8.10), read the model. The words ("1 month", "14 days") are checked by the compiler, not here, so a wrong span is a
problem naming its move rather than a throw; `Spans.read` (from `orthograph/server`) is how it reads one. Test:
`time.test.ts`.
