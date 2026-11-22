# telemetry

What a portal reads of its environment's live traffic (M1.13, `design/portal.md` holes 2 and 7), put on the wire for the client.
`PortalContext.live` is `{ environment, source, metrics, now, windowMs }`: `source` is a `TraceSource`'s `window` and `find`, `metrics` a
reader of `ortho.calls` (`prove`'s `FileMetrics`), `now` the only clock. Both are structural, so the portal never imports `prove`.

- `Telemetry.read(blueprint, live)` is the snapshot's `telemetry` (`GET /_portal/v1/snapshot?digest=`): `calls` (one row per call, newest
  first: a retry is one row; caller kind derived; duration the extent of its attempt spans; over budget from the model; request key from
  `request.key` on its attempts (M1.12a), `null` when none was sent; role held `null`, the page says `not yet`), `moves` and `journeys` per operation, and `metrics` (counts per operation and refusal from
  `ortho.calls`, with door refusals: counted by the metric, accounted for by no span, never a row). A source that fails is
  `unavailable` with its reason: nothing it would have filled is zero.
- `Telemetry.trace(live, id)` is `GET /_portal/v1/traces/<id>`: structure, timing, outcome, attempt and a log count per span.
- Scrubbed here: only declared operation and refusal names and a whitelist of structural attributes are copied, so a statement, a person's
  id, a payload value or a log body has nowhere to land. Test: `telemetry.test.ts`.
- A call is an operation's own attempts, not a trace (O3, `design/decisions/O3-call-id.md`): the runtime writes one `call.id` on every attempt span of a call, and the
  reader groups by it, so several calls under one distributed trace are several rows. For spans without it, an attempt joins a call only when exactly one could take it;
  otherwise those attempts are one call whose outcome is `unknown`, with no move. The window is each call's (its first attempt's start), whatever whole traces the source
  hands back. A move counts only for an attempt that did not lose its commit race.
- **The monitor's calls (M1.49).** `Telemetry.calls` gives every call of a window with no row limit, each with its `id` (the runtime's `call.id` when every attempt
  carries the same one, else the trace and its attempt spans; `Telemetry.identity`) and, on a defect, its `failure`: the deepest declared step span under the failing
  attempt that ended as an error, and the attempt's `error.tag`. A span is a declared step when it has a string `step.kind` and its name is one of
  `model.operations[op].steps`, read from the wire (`internal/spans.ts`), or the runtime's `<op>.commit` (the step `commit`). An adapter's span is walked through, never
  chosen. `-` is the operation itself: a defect no declared step explains (a read's, or a die outside every step). The view's `p95` is taken over the whole window
  before the rows are cut.
