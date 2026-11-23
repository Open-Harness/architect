# slots

The seats of an executor pool, as pure rules (GOAL17-executor-slots, section 2): `line` says who is next (every person's message, then every other, each oldest first)
and `seatFor` which seat is theirs (the lowest free of the pool, and the reserve seat 255 only for a person). `superagent.fill` is the one caller; the pool's size reaches it
as a number, so `tickets` imports nothing of `superagent`. Test: `slots.test.ts`, each cell.
