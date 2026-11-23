# work

`Busy`, counted work. Every handler, workflow and keeper job runs as counted work, so a world can wait until it is
quiet before it moves its clock. The clock spike (`design/spikes/world-clock.md`) showed why: Effect's `TestClock`
can't see a fiber waiting on I/O, so quiet has to be counted, not inferred. `BusyLive` counts inside one process.

Counted work holds a token while it runs (M8.07). The unit is a box (`BusyBox`): a request's, taken at its entry and held until the
response or the work ends; a spawn's own. `busy.as(owner)` names it (an operation's name, `agents/run/<runId>`), `counted` runs work under
the request's box when there is one, and `held` lists the owners of the fibers running. A sleep lends its token out (`lend`, a `Lease`)
and takes it back (`reclaim`) from wherever the wake happens; the token goes back to the world only when every fiber of the box is lent.
`BusyReporting` takes the box's token in the world's count (`WorldCount.enter`, an id with the world's generation) and releases exactly
that token (`leave(id)`); an id of an older generation or one already released does nothing. `spawn` gets a box and a token of its own,
taken before it returns.

Every fiber the runtime starts under a box is counted while it runs (`Metric.FiberRuntimeMetrics`), daemon or not, whether it forks others or not: a fiber with live children stays counted (`forkDetach`, a waiting `Effect.all`). Only a parent marked joining (`Busy.joining`, used by `Timers.within`, `Timers.all`, `Timers.raceFirst`) is not counted while it waits. An uncounted fiber that is still working corrupts a run without a sound; an over-count fails loudly as `NeverQuiet`. A box whose token the world no longer holds (a reset) is stale: it is interrupted at its next write section (`fenced`). Decision call 13.
