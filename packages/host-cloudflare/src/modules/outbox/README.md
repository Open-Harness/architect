# outbox

The event outbox (M5-reach-out Q1, Q3, Q5; GOAL17-pause; `design/decisions/GOAL17-outbox.md`). A row per declared `Blueprint.on` hop is
written by the store in the batch that journals the event (`fanout`, called from `store`'s commit), so an event and its rows commit together
or not at all. The drain takes every row due now, in journal order, claims it with one statement, calls the hop's operation as the system under
the key `on|<event id>|<operation>`, and records the outcome only where its claim is still its own.

- A refusal is an answer: `refused`, not retried. A hop's declared `onRefused` error ends the row `delivered` with the error's tag, no attempt,
  and calls the named operation in its place. A defect is retried: 1 s, doubling, at most an hour, 15 attempts, then `failed`.
- A hold (`_hold_<name>` view of the held thing's states) parks a row: it stays `pending`, keeps its place, and uses no attempt.
- The drain is counted work and reads the world's clock; it says when something is due next and the generated Worker sets a durable timer
  for it, so a clock move fires it. No wall clock and no `setTimeout`.
- `door` is `/_world/outbox*` (rows, mark, redeliver, hold, release), for worlds only.

Test: `outbox.test.ts`.
