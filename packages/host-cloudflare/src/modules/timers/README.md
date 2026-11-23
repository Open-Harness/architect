# timers

The world's timer table and its count of work in flight (K23 section 5, M8.07), kept in the world's Durable Object. The
Worker and every other process reach them through the object's RPC (`WorldTimersRpc`); `WorldEntry.work(env)` (the `world`
module) is `Busy`, `Timers` and `DurableTimers` built on that RPC.

- **The table.** One SQLite table, so a sleep and a durable timer share one order: by instant, then the order set, then
  owner. A sleeping row lives as long as the process that parked it, so it is dropped when the object starts afresh; a
  durable row outlives it. Firing a row counts its owner first and only then hands it back.
- **The count.** Each process reports the tokens it takes and gives back, each named by its owner. The world is quiet when
  none is held, on two reads in a row.
- **The controller.** A move of a stepped or scaled clock walks from timer to timer: wait until quiet, find the earliest
  timer due at or before the target, move the instant to it, fire what is due there, wait until quiet, repeat, then move to
  the target and wait once more. A quiet wait that passes its real-time limit (`ORTHO_QUIET_MS`, five seconds when unset)
  fails as `NeverQuiet`, naming each owner still busy; if that is the first wait, nothing has moved. A durable timer whose
  wake fails goes back into the table and fails the move as `WakeFailed`, naming it.
- **A real world** counts nothing and has no controller: its rows are fired by the object's alarm, which is set for the
  earliest row (or the world's lifetime, whichever is first). A stepped or scaled world sets no alarm for timers.

A durable row is handed to the host's `TimerWakes` by its kind; this world has no route for any kind yet, so firing one fails
the step, naming it (the keeper, M8.10, and Goals 8 and 10 add theirs). Decision: `design/decisions/M8-07-timers-and-quiet.md`.
Test: `timers.test.ts`.
