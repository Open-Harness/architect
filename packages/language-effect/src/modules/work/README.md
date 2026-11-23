# work

`Busy`, counted work. Every handler, workflow and keeper job runs as counted work, so a world can wait until it is
quiet before it moves its clock. The clock spike (`design/spikes/world-clock.md`) showed why: Effect's `TestClock`
can't see a fiber waiting on I/O, so quiet has to be counted, not inferred. `BusyLive` counts inside one process.

Each token is counted for an owner (M8.07): `busy.as(owner)` is the same service with its tokens named (a handler's is its
operation's name; `agents/run/<runId>` for an agent), `counted` and `spawn` tell the fiber whom its token is counted for so a
sleep gives back that same token, and `held` lists the owners a process holds. `BusyReporting` also reports each token to a
`WorldCount`, the world's count across every process, so a world that cannot become quiet can name who is busy. `adopt` keeps a
token the world already counted (a timer counts its sleeper before it wakes it) without reporting it again.
