# timers

`Timers`, the one way anything waits: `at` (fire work at an instant) and `sleep` (a durable sleep that gives its
counted-work token back while parked). `within` parks a counted port call until it
finishes or the timer interrupts it. The world's clock driver asks `due`, moves the clock, then `fire`s. Plain
`Effect.sleep` is banned in handlers by lint (L1.40). `TimersMemory` keeps the table in memory; stage five puts it in
the world's Durable Object, where `at` becomes an alarm.

`TimersLive` (M1.29) is the `Timers` of code that runs on a device or in a plain process, with no world to drive its clock: `sleep` waits on the real clock, and `at` (a timer to fire later) is a defect, since only a world can keep one. Also from `@orthograph/language-effect/device`.

`DurableTimers` (M8-timers-shape) sets a timer that outlives the fiber and the process: `set(at, owner, name, wake)`,
once per `(owner, name)` while pending, and `clear(owner, name)`. When it falls due the world hands it to the host's
`TimerWakes` (`wakesByKind({ workflow, agent, keeper })`), at least once and as counted work, which wakes whatever
process now runs its owner. `TimersMemory` provides `Timers` and `DurableTimers` over one table, so one instant's
timers fire in the order they were set. Owners are paths: `workflows/<workflow>/<execution>`, `agents/run/<runId>`,
`keeper/<thing>.<move>/<id>`.

`TimersWorld` (M8.07) is `Timers` and `DurableTimers` on the world's table, for every process that is not the world's Durable
Object. A wait is a row there, not a fiber: `sleep` publishes the row, lends its `Busy` token out, and waits on the `WorldTable`
port; the world holds a token of its own for the sleeper from the firing until the sleeper has taken its own back and acknowledged
(`cancel`), so it is never quiet in between, and the host points the request's clock at the instant the row fired. The host provides `WorldTable` (host-cloudflare, over the world's RPC).
