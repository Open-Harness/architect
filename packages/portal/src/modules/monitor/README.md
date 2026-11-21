# monitor

The portal's monitor (M1.49, K18, `design/decisions/K18-monitoring-falls-out.md` and its addendum; the issue's step is `design/decisions/M1-49-issue-attribution.md`).
It answers `GET /_portal/v1/monitor?digest=` (400 without a digest, 409 for another blueprint's, 404 without a live source) with `{ environment, now, alerts, issues }`.
It reads calls, never spans: the telemetry grouping gives each call its `id` and, on a defect, its `failure`.

- **Alerts.** `Monitor.read` evaluates `model.alertRules` over `live.source.window(ms, now)` for each window an alert names, each window grouped into calls once per read.
  A burn alert fires when `bad >= burn * (1 - target) * calls` over both its windows (equality fires, in integers) and its short window held at least `minCalls` calls.
  Every call counts, a refusal included: a refusal is a good call for the defect objective, and a latency call is bad when it took longer than the rule's `thresholdMs`.
  A refusal that opened no span (a door refusal) is not a call here. An anomaly or a verdict has no burn to read and is `unknown`, never `ok`. A window longer than
  `live.historyMs` (what the source can supply) is not read, and an alert needing it is `unknown`, as is one whose source could not be read.
- **Issues.** One per (operation, step, `error.tag`). The step is the deepest declared step span under the call's failing attempt that ended as an error (an adapter's
  span is walked through and never chosen; the runtime's commit span is the step `commit`). `-` is the operation itself: a defect no declared step explains, such as a
  read's or a die outside every step. A refusal opens none. `occurrences` counts calls: a call is its `call.id` (else its attempt spans), never a time. `firstSeen` and
  `lastSeen` are a call's start and the operation's declaration hash in the wire in force when the portal saw it; `regressed` is the two differing.
- **The ledger.** Issues live past the window in the `MonitorLedger` the portal is handed (`PortalContext.ledger`): opaque JSON by key, one key (`monitor/issues`). With none
  the monitor keeps nothing. A Worker's ledger is `env.PORTAL_LEDGER` (a key-value binding, the shape of Workers KV), else a book that lives as long as the isolate
  (`server/internal/ledger.ts`). The read-modify-write is not atomic across requests: two portals racing can lose one count, never invent one.
- Nothing here sends anything or reads a clock: `now` is `live.now`.

Test: `monitor.test.ts`; the check is `e2e/m1/39-m1-49-monitor-derived.test.ts`.
