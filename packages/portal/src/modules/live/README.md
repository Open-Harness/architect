# live

`Live.call({ source, journal }, trace)` is the portal's live view of one call (K5 seam 10, M1.21): a pure Effect over two injected
reads, the trace source (`find(trace)`: the Collector's files in a local world, Axiom later; `prove`'s `TraceSource` fits) and
`journal(trace)` (the world's `/_world/facts/journal?trace=`). The portal never reaches a database. It answers data only; its
screens are M1.13 and M1.25's.

- **steps**, in the order their start signals arrived: a step signal is an OTLP log record with `step`, `phase` (`start` or `end`)
  and, on `end`, `outcome`, whose span id is the step span's own. A step is `running` until its end signal or its span (which only
  exists once the step has ended), then `ended` with its outcome. The commit is not a step here.
- **commit**, once the commit span (`step.kind: "commit"`, M1.18) has ended: `outcome`, `writes`, `entries`. After a conflict the
  one that committed decides.
- **events**: a journal row shows only with a commit whose outcome is `committed`. A refused call has none.

Tests: `live.test.ts`, over a trace in memory. The world and the real Collector are check 13's (`e2e/m1/13-live-steps.test.ts`).
