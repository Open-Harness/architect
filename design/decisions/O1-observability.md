# O1: observability, from a span to Aaron's screen

Proposed 16 November 2026 by a 📐 designer thread, answering Aaron: "How is this supposed to work? What is the Axiom way
of doing this? How am I supposed to look at this and view this?" Revised the same day after Aaron: "we shouldn't be
hard-coded on Axiom. We also have PostHog as well. PostHog also has errors and an MCP. Does Axiom have an MCP and
errors?" Evidence: `spikes/local-trace-viewer/` (run for real), the existing code (`packages/target-effect` handler,
`packages/host-cloudflare` Telemetry, `packages/prove` telemetry), and primary docs read on 16 November 2026 (Axiom,
PostHog, Cloudflare, Grafana; sources at the end). Nothing was sent to Axiom or PostHog: there is no credential, and no
account or token was made.

What the revision changes, in one line: the core speaks only OpenTelemetry, and Axiom, PostHog and the local viewer are
three interchangeable **sinks** named in config. The first version of this record had Axiom built in; that is replaced.
The local spike result, the Docker decision and the alternatives Aaron raised earlier are kept.

## How it works

Say this aloud. Every operation you call makes a trace. A trace is the story of one call: one big span for the
operation, and a smaller span inside it for each step, with the move, the refusal and the payload written on it. The
code that makes these spans speaks one standard language, OpenTelemetry, over the web, and it knows nothing about
Axiom or PostHog.

Where the story goes is a setting. A **sink** is a destination you name in config: the local viewer, Axiom, or PostHog.
You can name several at once. The default is this: traces and logs go to Axiom, where the query language is strongest
and the free allowance is biggest; real defects, and only defects, also go to PostHog's error tracking, which groups
them into issues. Your own machine uses the local viewer. If you would rather have everything in PostHog, that is one
line of config, once a spike shows PostHog can answer the evals.

A declared refusal is not an error. "Allowance exhausted" is the system working. It shows on the trace as a refusal
tag and a log line, and it never opens an issue. A defect, meaning code that blew up in a way nobody declared, is the
only thing that counts as an error: it marks the span as failed and, if PostHog is a sink, becomes an issue with a
link back to the trace.

Locally, spans go to a small program called the Collector, in Docker. It writes plain files, which `prove` reads for the
nine evals, and it passes everything on to the viewer, a second container with a web page. In the cloud there is no
Collector: the deployed worker sends straight to each sink with a write-only token.

The same evals can then run on live data. That is `watch`. It reads through one reader, a `TraceSource`, with a file,
an Axiom and, probably, a PostHog version. Prove only ever reads local files, so a pull request from a fork, which has
no secrets, still proves.

Agents look at all of this the same way you do. The safest way is one command, `architect telemetry trace`, which
prints a trace from any sink. Axiom and PostHog also each have an official MCP server; PostHog's can be locked to read
only, Axiom's cannot be, so the harness gets the command and PostHog's read-only tools, not Axiom's MCP.

One rule protects secrets. Only fields declared public may become attributes. Today every payload and answer field
becomes one, passwords and tokens included. That is fixed before any real token goes near a third party.

## The shape, in one picture

```text
handler span (+ refusal / defect conventions) ── Effect OTLP, per request, flushed under waitUntil ──┐
                                                                                                    │ sinks = a list per environment
 local  Collector 0.164.0 (Docker) ◀────────────────────────────────────────────────────────────────┘
        ├─ file/traces, file/logs ──▶ prove and `watch --env local` (unchanged)
        ├─ otlphttp/viewer ──▶ grafana/otel-lgtm 0.39.0 (Tempo, Loki, Grafana), while it runs
        └─ otlphttp/<sink> ──▶ Axiom or PostHog, when a token is present
 cloud  worker ── one exporter per sink: Axiom (traces, logs), PostHog (logs, traces, or defects) ──▶ the sinks
 watch  `architect watch` ── TraceSource: File | Axiom (APL) | PostHog (to be proven) ──▶ the same evals as prove
```

## The three tools, side by side (what the docs say)

| | Axiom | PostHog | Local viewer (`grafana/otel-lgtm`) |
|---|---|---|---|
| Traces in | OTLP/HTTP, `https://<edge>/v1/traces`, `Authorization: Bearer`, `X-Axiom-Dataset` | OTLP/HTTP, `https://us.i.posthog.com/i/v1/traces` (EU host `eu.i.posthog.com`), `Authorization: Bearer <project token>` | OTLP on 4318, no auth |
| Logs in | `/v1/logs`, own dataset | `/i/v1/logs` | same receiver |
| Errors | No error-tracking product found in the docs. Traces have a "Top Errors" list and `error` / `status.code` fields; monitors (match, threshold, anomaly) alert on a query | Error tracking: issues grouped by fingerprint, assignment and suppression rules, alerts. Exceptions arrive as `$exception` events from a PostHog SDK or capture call; OTel exception span events are not documented as feeding it; one PostHog page says OTLP logs carrying `$exception` become issues (unconfirmed) | Search `{ status = error }` in TraceQL; no issues |
| MCP | Official, remote: `https://mcp.axiom.co/mcp` (EU `mcp.eu.axiom.co/mcp`). OAuth acts as the user, or a personal access token plus an org id. Tools: query with APL, list datasets, fields and metrics, manage dashboards, monitors, notifiers (so it can write). No read-only mode documented | Official, remote: `https://mcp.posthog.com/mcp`, routes US or EU by the account. OAuth, or a personal API key with the "MCP Server" preset (project scoped). Read-only by header `x-posthog-read-only` or `?readonly=1`; `?tools=` and `?features=` allowlists; can pin one project. Tools: 24 for logs (`query-logs`), 13 for traces (`apm-trace-get`, `apm-spans-tree`, `query-apm-spans`, `apm-spans-aggregate`, `apm-service-health`), 30 for errors (`query-error-tracking-issues-list`, `query-error-tracking-issue`, `query-error-tracking-issue-events`) | None. Tempo and Loki have HTTP APIs |
| Query language | APL, documented query API | A query box for spans and logs; the MCP wraps tools; no documented span query language or public span API found | TraceQL, LogQL |
| Free tier | 500 GB a month ingest, 25 GB storage, 30 days, 10 GB-hours query | Logs and traces share one meter: 10 GB a month free on the logs, tracing and pricing pages, 50 GB on another page (conflict; check live); error tracking 100,000 exceptions a month free; default retention 14 days, longer at $0.05 per GB-month | Free, local, thrown away |
| Regions | US East 1 or EU Central 1, fixed at creation | US or EU cloud, per project | n/a |
| Token that writes | Basic API token, scoped to named datasets | The project token (`phc_`), the same public write key as events; not per-signal and not per-dataset | none |
| Token that reads | Advanced API token, query on named datasets, dollar caps | Personal API key (`phx_`); the project token must not be used | none |
| Cloudflare's built-in export | Traces and logs | Logs only; traces are not supported | n/a |

## The Axiom model (what the docs say)

- **Organisation, datasets.** An organisation has datasets. Logs and traces go to an *events* dataset; metrics to a
  *metrics* dataset. "Each OTel component needs its own dedicated dataset", so traces and logs are two datasets.
- **Endpoints.** `https://<edge domain>/v1/traces`, `/v1/logs`, `/v1/metrics`. Edge domains: `us-east-1.aws.edge.axiom.co`
  and `eu-central-1.aws.edge.axiom.co`. The organisation's default edge is fixed when it is created and a dataset's edge
  can never change, so pick the region once. Headers: `Authorization: Bearer <token>` and `X-Axiom-Dataset: <dataset>`
  (metrics use `x-axiom-metrics-dataset`). OTLP over HTTP is the documented route (no gRPC mentioned); Cloudflare's own
  exporter documents that it sends JSON, not binary, and points at `api.axiom.co/v1/traces`, so JSON is accepted. Our
  `Telemetry` already sends JSON. To confirm on the first real send.
- **Tokens.** Two kinds that matter. A *basic API token* only ingests, into the datasets you pick. An *advanced API
  token* picks datasets and actions (for example query on one dataset) and can carry hourly and daily dollar caps on
  query cost (over the cap, queries get HTTP 429; ingest is not affected). A token's privileges cannot be changed after
  creation, so rotate by creating a new one. A *personal access token* does everything its owner can; never use it.
- **Seeing a trace.** Dashboards, "OpenTelemetry Traces" (it detects OTel trace datasets by itself), a table of traces;
  click a trace id for the waterfall, with parent and child spans (right-click collapses a span). The Query tab works
  too: a query that returns `_time` and `trace_id`; click the id. Trace dataset fields: `trace_id`, `span_id`,
  `parent_span_id`, `name`, `kind`, `duration`, `error`, `status.code`, `status.message`, `attributes`, `events`,
  `links`, `resource`, `service.name`. The pages I could read did not document a service map, a direct URL to one
  trace, or how logs link to traces; to check on the first real ingest, not assumed.
- **Query API.** `POST https://<edge domain>/v1/query/_apl?format=tabular`, `Authorization: Bearer`, JSON body
  `{ "apl": "...", "startTime": "...", "endTime": "..." }`. Tabular answers are column-oriented with a status block
  (`isPartial`, timings). The docs read do not state row limits or rate limits.
- **Free tier (Personal plan, $0, no card).** 500 GB a month of ingest, 25 GB storage, 30 days' retention, 10 GB-hours
  a month of query compute, community support, soft limits on datasets (no fixed number). Next plan: $25 a month with
  1 TB ingest, 100 GB-hours and 100 GB storage. Compute, not ingest, is what polling would eat.
- **Cloudflare.** Workers can export traces and logs by themselves to an OTLP destination (a destination made in the
  dashboard, named in `wrangler`: `observability.traces` and `observability.logs` with `enabled`, `destinations`,
  `head_sampling_rate`, `persist`). `persist` defaults to true, and from 1 December 2026 persisted data counts against
  Cloudflare's observability usage, so export-only would set it false. Workers metrics and custom metrics are not
  exported. The pages read say nothing about spans a program makes itself, or about Durable Objects. Alchemy has an
  `ObservabilityDestination` resource, so the destination can be code.


## Why the shape is this one

Three things are true at once. The spans that matter to Architect (step spans with `step.kind`, the refusal, the move,
the payload) are made by our own Effect layer, not by the platform. Local runs in workerd, where Cloudflare's built-in
export is not documented to exist. And `prove` has to run on a fork with no secrets, and judge its evals in about six
seconds, deterministically. So: **one exporter, ours, in every environment; only its destination changes.** Cloudflare's
built-in export can be added later for the platform's own spans, into the same datasets, once a spike shows custom spans
merge into its traces (unknown today).

## Aaron's alternatives, weighed

Aaron asked why Docker at all, and whether everything should go straight to Axiom. Each option below is graded against
this design on: real not fake, CI without credentials, eval read-back latency and determinism, cost and free-tier
volume, and what Aaron sees. The Axiom figures are from the docs; nothing was measured against a live Axiom, so
read-back latency there is the one number I could not get, and is marked so.

**1. Deployed environments straight to Axiom, no Collector.** Two ways to do it.

```ts
// A. our own layer, Authorization header on each exporter (host-cloudflare/telemetry/service.ts)
OtlpTracer.layer({ url: "https://us-east-1.aws.edge.axiom.co/v1/traces",
                   headers: { Authorization: `Bearer ${token}`, "X-Axiom-Dataset": "acme-staging-traces" }, ...options })
OtlpLogger.layer({ url: "https://us-east-1.aws.edge.axiom.co/v1/logs",
                   headers: { Authorization: `Bearer ${token}`, "X-Axiom-Dataset": "acme-staging-logs" }, ...options })
```

```jsonc
// B. Cloudflare's built-in export (wrangler.jsonc, destinations made in the dashboard or by Alchemy)
"observability": { "traces": { "enabled": true, "destinations": ["axiom-traces"], "head_sampling_rate": 1, "persist": false },
                   "logs":   { "enabled": true, "destinations": ["axiom-logs"],   "head_sampling_rate": 1, "persist": false } }
```

Decision: **yes, A is the cloud path.** It is what carries the step spans and the refusal. B is an add-on later.
Effect's exporters accept `headers` (`OtlpTracer.ts:57`), so the change is small: `Telemetry.serve` takes headers and a
dataset per signal, where today it takes only a `url`.

**2. Local `dev` and `env up` also to Axiom, no local viewer.**

```yaml
# the Collector, only when AXIOM_INGEST_TOKEN is in the environment. The token is read by the Collector, never written.
exporters:
  otlphttp/axiom:
    endpoint: https://us-east-1.aws.edge.axiom.co
    headers: { authorization: "Bearer ${env:AXIOM_INGEST_TOKEN}", x-axiom-dataset: acme-dev-traces }   // logs: its own exporter
```

**3. Prove and the evals read back from Axiom.**

```ts
// TraceSource: the one reader. FileSource (today) and AxiomSource answer the same call.
traces(wanted): Effect<Map<traceId, { spans, logs }>>
// AxiomSource.traces: POST https://<edge>/v1/query/_apl?format=tabular
//   ['acme-ci-traces'] | where trace_id in ("<id>", ...) | project trace_id, span_id, parent_span_id, name, duration, ['status.code'], attributes
```

| Question | Today: Collector, files, optional viewer | Option 1: cloud straight to Axiom | Option 2: local also to Axiom, no viewer | Option 3: prove reads from Axiom |
|---|---|---|---|---|
| Real, not fake | Real Collector, real OTLP, real viewer | Real | Real | Real |
| CI with no credentials (forks get none) | Passes: files only | Not relevant: CI deploys nothing | Falls back to nothing: a fork with no token sees no telemetry at all | Fails on forks. Needs a token in CI, and a pull request from a fork has none |
| Eval read-back latency and determinism | About 12 ms after the response, 50 concurrent requests complete and unmixed (the `otlp-from-workerd` spike) | n/a | n/a | Unmeasured. Axiom ingests then indexes; every run would need a poll loop with a quiet window, and parallel runs share a dataset. Slower and less deterministic by construction |
| Cost, free-tier volume | Free, local | A grant trace is a few KB; 500 GB a month is far above any staging load. `persist: false` avoids Cloudflare's charge from 1 December 2026 | Every `dev` save and prove run ingests; still small, but the 30-day retention fills with throwaway worlds | Polling burns the 10 GB-hours of free query compute that `watch` needs |
| What Aaron sees | The viewer page, after `telemetry view`; or the trace tree in the terminal | Axiom, with real traffic | Axiom for everything, one place | Axiom |
| Offline, no account | Works | Needs the network | Needs the network and an account to see anything | Same |

**Native `otelcol-contrib` instead of Docker.** A native build exists: `otelcol-contrib_0.164.0_darwin_arm64.tar.gz` is
a real release asset (98 MB, checked with a HEAD request). It would remove Docker for prove on macOS. It is not worth it
now: CI is Linux and would fetch a second asset with its own checksum, a download-and-cache step becomes our code and
its failure modes, and the pinned image already gives one identical Collector on every machine. The seam is
`Collectors.start`; swapping Docker for a binary later changes one file. Keep Docker; revisit only if Docker's absence
blocks someone. The viewer needs Docker anyway.


## The local spike, kept

`spikes/local-trace-viewer/` ran `architect prove --env local` in `examples/acme` through prove's own Collector with one
extra `otlphttp` exporter, into `grafana/otel-lgtm:0.39.0` (digest
`sha256:4c8056c9c05fcb3c8fd93800e85334bfd79b4d0271b47a54a121a64af41fe1fe`, 30 October 2026). Tempo's API returned the
`allowance.grant` trace: 6 spans, with `allowance.grant.insert` (`step.kind=database`) under the operation span,
`move.name=grant` and `move.to=active` on it, and the log linked by `span_id` and `trace_id`, with trace-to-logs and
log-to-trace links provisioned by the image. Found: by id the trace is immediate, the search list lags minutes; every
prove trace is headless because the journey's span is not exported (L2.O2); and `payload.password`, `answer.token`,
`answer.apiKey` and `answer.session` are already attribute names (the allowlist section). Jaeger stores no OTLP logs,
so it is not the viewer. Nothing in the revision changes this result: the viewer is the `local` sink.

## The core, and the sinks

### The core speaks OTLP, plus three conventions of ours

The core is what `target-effect` and `host-cloudflare` do: Effect spans and logs, exported as OTLP, with the resource
attributes `service.name` and `deployment.environment.name`. It never names a vendor. On top of plain OTLP, three
conventions of ours, which every sink and every eval relies on:

| Convention | On the span or log | Why |
|---|---|---|
| A declared refusal | span attribute `refusal=<Tag>` and `refusal.log`; HTTP 4xx; span status **ok**; the log at info | An expected outcome. It must not turn the span red, count in "Top Errors", or open an issue |
| A defect | span attribute `defect=<first line>`; the `exception.*` fields; HTTP 500; span status **error**; the log at error; one **defect record** per defect | The only error. Defects are what error tracking is for |
| Steps and moves | child span `<operation>.<step>` with `step.kind`; `move.name`, `move.to` on the operation span | The evals' evidence, and what a person reads in any viewer |

Today the code writes `refusal`, `refusal.log` and `defect` (`handler/service.ts`), but a failed Effect span ends with
an error status whether the failure was a declared refusal or a defect, which I did not verify and which would put every
refusal in "Top Errors". L2.O2 settles it by a test on the span status, and makes refusals end ok. (Superseded by O4, 21 November 2026: "end ok" is a successful exit, exported as UNSET.)

A **defect record** is one small value the handler wrapper emits per defect: operation, trace id, exception type,
message, stack, and a fingerprint of operation plus type. It is also on the span and in the log, so a sink that only
speaks OTLP loses nothing. A sink that has an error product (PostHog) turns it into an issue.

### A sink is an adapter, named in config

```ts
// the seam, in host-cloudflare/telemetry and prove/telemetry (types.ts): what every vendor must say
interface Sink {
  readonly id: string                                          // "axiom" | "posthog" | "local"
  readonly signals: ReadonlyArray<"traces" | "logs" | "defects">
  readonly worker: (env: Environment) => Layer.Layer<...>      // exporter layers for a Worker: url, headers, secret NAMES
  readonly collector: (env: Environment) => CollectorExporter  // the fragment the local Collector gets
  readonly source?: (env: Environment) => TraceSource          // read-back for watch; absent means "write only"
  readonly open: (trace: string, env: Environment) => string   // where a person looks at it
}
```

```ts
// environments/staging.ts. A list, so one sink or several is the same line of config.
telemetry: [
  Telemetry.sink.axiom({ edge: "us-east-1", ingest: Secret.named("AXIOM_INGEST_TOKEN"), query: Secret.named("AXIOM_QUERY_TOKEN"),
                         signals: ["traces", "logs"] }),
  Telemetry.sink.posthog({ region: "us", ingest: Secret.named("POSTHOG_PROJECT_TOKEN"), query: Secret.named("POSTHOG_QUERY_KEY"),
                           signals: ["defects"] }),
],
// everything in one place instead:
telemetry: [Telemetry.sink.posthog({ region: "us", ..., signals: ["traces", "logs", "defects"] })],
// environments/local.ts
telemetry: [Telemetry.sink.local()],
```

The compiler resolves the list into the generated worker's exporters and the Collector's pipelines; project code never
builds a URL. A sink adapter is one small module, `packages/host-cloudflare/src/modules/sinks/<id>/`, with the six slots.
The core and every other sink are untouched by a new one. In the cloud, several sinks mean several exporter flushes
under `waitUntil` per request; the budget is three. (A router Worker in front would hide that but is one more thing to
deploy and trust; not needed at one to three sinks.)

**Defaults, by signal.** Traces and logs go to **Axiom**; defects go to **PostHog** (error tracking) and also stay on
the spans and logs in Axiom; local goes to the viewer. The reasons are in the table above: Axiom has the larger free
allowance (500 GB against a shared 10 to 50), a documented query API with dataset-scoped tokens (what `watch` needs),
and longer retention; PostHog is the only one of the two with issues, grouping and assignment. The issue carries the
trace id, so a click goes from the issue to the trace in Axiom (`Sink.open`).

### How a defect and a refusal show up, in each tool

| | Local viewer | Axiom | PostHog |
|---|---|---|---|
| **Declared refusal** (`AllowanceExhausted`) | An ordinary span, status ok, `refusal` attribute; TraceQL `{ span.refusal != nil }`; the log line at info, linked | A span with `refusal` set and no `error`; count them with APL, alert with a threshold monitor on their rate; not in "Top Errors" | Spans and logs only, found by attribute filter; **never** an exception, never an issue |
| **Unhandled defect** (a thrown bug in a handler) | Span status error, `defect` and `exception.*`; TraceQL `{ status = error }`; the error log, linked | A span with `error` true and `status.code` error; it appears in "Top Errors"; a match monitor on it can notify | The span as failed; plus, from the defect record, an **issue** in error tracking (`$exception` with type, message, stack, our fingerprint, the `trace_id` and operation as properties), grouped, assignable, alertable |
| **Our own evals** | `watch` and prove treat a refusal as expected and a defect as a failure | same | same |

Open: how PostHog accepts the defect. Its docs describe SDK `captureException` and warn against sending `$exception`
through a raw capture call; the OTLP route for exceptions is undocumented. So the PostHog adapter's defect path is
decided in its step, by trying, in this order: the `posthog-node` SDK inside the Worker, then the same via the
Collector; fall back to an OTLP log carrying `$exception` if PostHog confirms that route.

### `watch` reads through a `TraceSource`

```ts
interface TraceSource {
  readonly traces: (wanted: ReadonlyArray<{ trace: string; parent: string }>) => Effect<ReadonlyMap<string, Trace>>
  readonly window: (query: { operation: string; since: Duration }) => Effect<{ p95: Duration; n: number; refusals: number; defects: number }>
}
```

| Source | Answers `traces` (whole trace by id, with attributes, start times, parents, logs) | Answers `window` (p95, counts) | Verdict |
|---|---|---|---|
| `FileSource` | Yes, today | Yes | prove and local `watch` |
| `AxiomSource` | Yes by APL (`where trace_id in (...)`), pending the attribute field path | Yes (`percentile`, `summarize`) | Can answer every eval except coverage. Needs a first real send to confirm paths |
| `PostHogSource` | **Not assumed.** `apm-trace-get` and `apm-spans-tree` return a trace and `query-logs` returns logs, but whether `payload.*`, `answer.*`, `move.*`, exact span start times and log-to-span links survive is unknown | Likely yes: `apm-spans-aggregate`, `apm-service-health`, a latency histogram | Until a spike shows the attributes and order survive, it cannot be trusted for **answer shape, declared errors, machine path, events, steps and explainability**; it can serve performance and counts. Coverage is prove's alone in every source |
| Viewer (Tempo, Loki) | Yes by their HTTP API | Yes | Not used by evals: files are simpler |

So Axiom is the one `watch` source I would build first; PostHog is a source only if its step (L2.O9) passes. A project
whose only sink is PostHog then gets `watch` for performance and counts, and the tree evals stay prove-only, which the
build must say plainly.

### Agents and the two MCP servers

| Who | How they investigate | Why |
|---|---|---|
| Any agent, our harness included (H1) | `architect telemetry trace <id> [--env]`, and a harness tool `telemetry.trace` built on `TraceSource`. Same tree and same output from any sink | One surface for every sink; read-only by construction; uses the scoped query token, never a personal token; the output is our own format, with refusal and defect marked |
| An agent in a supervised session (Claude Code) | Either MCP, by OAuth as Aaron. PostHog: `query-error-tracking-issues-list`, then `query-error-tracking-issue-events` for a defect's events, then `apm-trace-get` by the trace id on the event; `query-logs` for its lines. Axiom: its APL query tool on the traces dataset, `where trace_id == ...`; monitors via the monitor tools | Aaron is watching, and OAuth acts as him |
| The harness, unattended | **PostHog MCP only if wanted**, mounted read-only (`?readonly=1`), with `?tools=` limited to the read tools above, pinned to one project, with a project-scoped personal key. **Not Axiom's MCP**: its header auth is a personal access token (everything its owner can do), it has write tools for dashboards, monitors and notifiers, and no read-only mode is documented | The harness must not be able to change monitors or read other datasets |

The sessions that build Architect already have a PostHog connector, so the supervised route works today for PostHog.
Whether the harness mounts any MCP is a later step (L2.O10); the command comes first and needs neither.

## Shapes, graded

The rubric is Aaron's standing one: floor-first (does it ship the real thing now), reversibility, blast
radius, correctness and integrity, parallelizability, fit with what is there.

| Shape | A · Axiom built in | B · one sink per environment, adapters | C · adapters, a list per environment, defaults by signal | D · every signal to every sink |
|---|---|---|---|---|
| What it is | The first version of this record: Axiom's URL, headers and APL in `host-cloudflare` and `watch` | The `Sink` seam; each environment names one | The `Sink` seam; each environment names a list; each sink says its signals | The same list, but every sink receives traces, logs and defects |
| Floor-first | ✅ Smallest to ship; nothing else to learn | ✅ Same floor plus one interface | ✅ Ships the Axiom path first, PostHog second, both real | ⚠️ Ships, but doubles every cost and every leak surface on day one |
| Reversibility | ❌ A second vendor means touching the exporter, the Collector, `watch` and the docs | ✅ Swap a sink in one line | ✅ Same, and adding or dropping a sink touches no other | ⚠️ Easy to switch off, but data already in two third parties stays there |
| Blast radius | ⚠️ A change to Axiom's API reaches the core | ✅ Confined to one adapter | ✅ Confined to one adapter each | ❌ Every adapter sees all data, so one leaky attribute leaks twice |
| Correctness and integrity | ⚠️ Errors have no issue grouping at all | ⚠️ One tool has to be the best at traces, logs and errors, and none is | ✅ Each signal goes to the tool that does it best; refusals never reach error tracking | ⚠️ Duplicated counts and two truths for p95 and error totals |
| Parallelizability | ❌ One module owns everything | ✅ Sinks are independent modules | ✅ Each sink is a step that can be built in parallel after the seam | ✅ Same |
| Fit with what is there | ⚠️ Matches the docs' `sink: "axiom"` literally, against the packages' no-vendor rule | ✅ Matches `Telemetry.otlp` plus the Collector's exporters, and the TraceSource seam already proposed | ✅ Same, and matches how the harness and `watch` already want one reader | ⚠️ Matches nothing; the evals would read one source anyway |

**Recommendation: C.** It is B with the one thing Aaron named, a PostHog beside Axiom, and a one-sink project is just a
list of one. Defaults by signal: traces and logs to Axiom, defects to PostHog, local to the viewer. A is rejected
because Aaron has two tools and errors are the one place they differ. D is rejected because it doubles data leaving
the machine for no new answer.

## Decision

1. **The core is vendor-free:** OTLP plus the refusal, defect and step conventions. No vendor name in `target-effect`,
   `host-cloudflare/telemetry` or `prove`'s evals.
2. **Sinks are adapters** (`Telemetry.sink.axiom`, `.posthog`, `.local`), a list per environment in
   `environments/<env>.ts`, replacing the `Telemetry.otlp({ sink: "axiom", dataset })` shown in the docs. The docs'
   example is to be updated in the step that builds the seam.
3. **Defaults by signal:** traces and logs to Axiom; defects to PostHog; local to the viewer. **Aaron's call, question 1:**
   which tool is the default if he wants one.
4. **Refusals are never errors.** They end ok, are never sent to error tracking and are never in "Top Errors". (Superseded by O4, 21 November 2026: "end ok" now means the span exits successfully, which Effect 4.1.4 exports as OTLP UNSET, never ERROR.)
5. **Prove and CI read only local files.** `watch` reads a `TraceSource`: File, then Axiom; PostHog after its spike.
6. **Cloud has no Collector;** each sink is a direct exporter from the Worker, our own layer, not Cloudflare's built-in
   export (PostHog does not accept built-in traces at all).
7. **Docker stays** for the Collector and the viewer. A native `otelcol-contrib` build exists (below) and is a later swap.
8. **Jaeger is rejected** (no logs). `grafana/otel-lgtm` is the viewer.
9. **Agents** use `architect telemetry trace` and, in a supervised session, either MCP; the unattended harness gets
   PostHog's MCP read-only at most and never Axiom's.

## Design

### The path of a span

Handler (Effect span, step child spans, defect record) → `Telemetry.serve` per-request `ManagedRuntime` (flushed under
`waitUntil`; `x-trace-id` on every response) → the environment's sinks.

| Environment | Sinks (default) | Where it lands |
|---|---|---|
| `local` (dev, env up, prove) | `local`: the Collector in Docker | `traces.jsonl`, `logs.jsonl`, `metrics.jsonl`; the viewer when running; any other sink named, when its token is present |
| `ci` (prove on a fresh world) | `local` | files only, no credentials |
| `staging`, `production` | Axiom (traces, logs) and PostHog (defects) | per the next sections |

### Axiom: datasets

One dataset per environment per signal, named from the project and environment (never typed by hand):
`acme-dev-traces`, `acme-staging-logs`, `acme-production-traces` and so on. A token is scoped to datasets, so a staging
token cannot write production; Axiom requires traces and logs in separate datasets. Spans carry
`deployment.environment.name` and `service.name`. O2 sends call metrics to `<project>-<env>-metrics`. Edge: one
region, chosen once (it cannot change); recommendation US East 1.

### PostHog: projects

PostHog has no per-dataset token, so the unit of separation is the **PostHog project**: one for staging and one for
production, each with its own `phc_` project token. Region (US or EU) is a property of the account. A production
token therefore cannot write to staging, and the project token is not a secret in PostHog's own model (it is the key
browsers use) but is treated as one here: named, never printed or written. Error issues, spans and logs of one
environment sit together in one project.

### Tokens, and where they live

| Token | Kind | Scope | Lives | Used by |
|---|---|---|---|---|
| `AXIOM_INGEST_TOKEN` per environment | basic API token | ingest into that environment's two datasets | the environment's secret store (Cloudflare secret set by Alchemy, D3 #2); locally the shell or keychain | the worker; local teeing |
| `AXIOM_QUERY_TOKEN` | advanced API token | query on those two datasets, with a dollar cap | Aaron's keychain; CI only for a deliberate staging `watch` job | `watch`, `telemetry trace` |
| `POSTHOG_PROJECT_TOKEN` per environment | project token `phc_` | write to that one project (events, logs, traces, exceptions) | same as the ingest token | the worker; local teeing |
| `POSTHOG_QUERY_KEY` | personal API key `phx_`, project-scoped, minimal read scopes | read that project | Aaron's keychain | `PostHogSource`, `telemetry trace`, the PostHog MCP |
| none | Axiom personal access token | never used | | |

The config names secrets and never holds them (D3 #2). No token is printed (the CLI says `AXIOM_INGEST_TOKEN set`),
written to a file, a commit, a log or an attribute. The Collector's config refers to `${env:NAME}`. Tokens are created by
Aaron in each tool; nothing here creates one. Axiom tokens cannot be edited after creation, so rotate by making a new one.

### The CLI

| Command | What it does |
|---|---|
| `architect telemetry view` | Starts the viewer (`grafana/otel-lgtm` pinned by digest, loopback only, no volume, anonymous access) as `architect-viewer`; prints its address; the next prove or `dev` Collector also forwards to it. Idempotent |
| `architect telemetry stop` | Stops and removes it. Nothing stays running or open |
| `architect telemetry trace <id> [--env <e>]` | Prints the trace as a tree with its logs, from any sink's source. Refusals and defects marked. Works with no viewer and over SSH; the one agent surface |
| `architect telemetry open <id> [--env <e>]` | Opens the sink's own page: the viewer locally; the sink named by `Sink.open` otherwise (an issue's page for a defect, a trace page for the rest) |
| `architect prove --view` | Starts the viewer if needed and prints, for every failed eval, the trace id and its viewer link |

### The allowlist and redaction

Today `target-effect` writes every payload and answer field as an attribute, so a local Tempo already lists
`payload.password`, `answer.token`, `answer.apiKey` and `answer.session`
(`spikes/local-trace-viewer/evidence/attribute-names-in-tempo.txt`). L2.P (N1) fixes this at the source: a field's value
becomes an attribute only if the compiler marked it `public`. The rule matters more with two third parties, because
each sink receives what the core emits, and a defect record's message and stack can carry values too.

1. **The source is the only dependable layer,** because the cloud path has no Collector in front. The allowlist lives
   in `target-effect`, from the compiled model, and applies to the defect record's message the same way (the stack
   stays, the values in it do not).
2. **No sink that leaves the machine is switched on before L2.P is done.** The first `axiom` or `posthog` environment
   waits for it.
3. **Defence in depth locally:** the Collector carries an `attributes` processor deleting keys that match the model's
   private field names, and prove gets a check that fails if a private field's name appears as an attribute key in any
   trace. That check is the proof, not a promise.

The agent harness (H1) exports spans through the same layer; its rule, "content never in attributes", is the same rule.

### What Aaron clicks

**Locally.** 1. Run `architect telemetry view`; it prints the address. 2. Run `architect dev`, a journey, or
`architect prove --view`; a failing eval prints its trace id. 3. Open the address, choose Explore, then the Tempo
source. 4. Paste the trace id, or search `{ span.operation = "allowance.grant" }` (the search list can lag a few
minutes; by id is immediate). 5. Click the trace: `POST`, then `allowance.grant`, then its step
`allowance.grant.insert`; click a span for its attributes: the payload, `move.to`, `step.kind`, any `refusal`. 6. Click
"Logs for this span": Loki shows its lines; from a log line the `trace_id` field jumps back. 7. `architect telemetry
stop`.

**In Axiom.** 1. Sign in, open Dashboards, then "OpenTelemetry Traces", pick `acme-staging-traces`. 2. Search a trace
id (`x-trace-id` is on every response) or sort by duration or errors; "Top Errors" lists defects, not refusals. 3. Click
the id for the waterfall. 4. For logs, open `acme-staging-logs` in the Query tab and filter on that `trace_id`.

**In PostHog.** 1. Open the staging project. 2. For a defect: Error tracking, then the issue; its events carry the trace
id and operation. 3. For a trace: the Tracing page, search by service, status or attribute, or the trace id; the
waterfall shows the correlated logs in the span inspector. 4. For refusals: Logs, filter on `refusal`.

## Build steps (proposal; not edited into the plan; supersedes the L2.O1 to L2.O8 of the first version)

Each ends green with its check. They come after L2.04 and L2.P. Steps that touch a real vendor need Aaron.

| Step | What | Needs | Done when |
|---|---|---|---|
| L2.O1 | The viewer: `Viewer` in `prove`'s telemetry (`start`, `stop`, pinned digest, loopback, anonymous Grafana), the Collector's optional second exporter, `architect telemetry view` and `stop` | L1.15 | `telemetry view` then `prove --env local` in `examples/acme`: the viewer's Tempo API answers for the `allowance.grant` trace with `allowance.grant.insert` and its log by `trace_id`; `stop` leaves no container and no open port; plain `prove` starts no viewer |
| L2.O2 | Conventions: a refusal ends its span ok and a defect ends it error; the defect record; prove exports `journey.<name>` as each trace's root | L2.O1 | A refusing call's span has status ok and `refusal`; a planted defect's span has status error, `defect`, and one defect record; the viewer shows `journey.<name>` as root; the nine evals pass |
| L2.O3 | `telemetry trace` and `open` over the files | L2.O1 | `architect telemetry trace <id>` prints the tree and logs of the spike's output for a recorded run, marking a refusal and a defect differently |
| L2.O4 | `TraceSource` with `FileSource`; prove reads through it | L2.O1 | Prove's tests pass unchanged; a unit test drives the evals from a second, hand-built source |
| L2.O5 | The `Sink` seam and `Telemetry.sink.local`: the list in `environments/<env>.ts`, the compiler resolving it to the worker's exporters and the Collector's pipelines; the docs example updated | L2.O4 | acme's `environments/local.ts` names `[local]` and prove behaves as before; a test adds a second, fake-endpoint sink by config alone and its exporter appears in the Collector's config |
| L2.O6 | The private-attribute check and the Collector's delete processor | L2.P | A fixture with a `private` field makes prove fail naming the attribute key; acme passes |
| L2.O7 | `Telemetry.sink.axiom` and `AxiomSource` | L2.O5, L2.O6, **Aaron's yes and Axiom tokens** | One staging call is in `acme-staging-traces` with its step spans and `acme-staging-logs` has its lines, by trace id; `telemetry trace` prints it from Axiom; no token string anywhere in files, logs or spans |
| L2.O8 | `Telemetry.sink.posthog` for traces, logs and defects; first the defect route by trying the SDK, then the Collector, then an OTLP log | L2.O5, L2.O6, **Aaron's yes and PostHog tokens** | A planted defect on staging is one issue in PostHog's error tracking with the trace id; a declared refusal opens no issue; spans and logs of the same trace are in the project |
| L2.O9 | `PostHogSource` as a spike, then a source if it passes | L2.O8 | The spike shows, for one staging trace, whether `payload.*`, `answer.*`, `move.*`, step start times and log links survive; the step then names which evals it can answer (the table above) |
| L2.O10 | `watch --env staging` over `TraceSource`; the harness tool `telemetry.trace`; the PostHog MCP mounted read-only in the harness if wanted | L2.09, L2.O7, A-steps | `architect watch --env staging` prints p95 against budget and refusal counts, and a planted slow handler shows as drift; a harness run explains a planted defect from its trace id using only `telemetry.trace` |
| L2.O11 ∥ | Datasets, projects and secrets in `architect deploy`: create Axiom datasets, set ingest secrets through Alchemy; `destroy` removes datasets | L2.01, L2.O7 | `deploy --env sandbox` then `destroy` leaves no dataset (checked with a query-only token), subject to the dataset-creation question |

## Questions for Aaron (batched; all wait on him)

1. **Which tool is the default?** My recommendation: Axiom for traces and logs, PostHog for defects, the local viewer
   on your machine. The alternative is PostHog for everything, which I would only offer after the PostHog spike
   (L2.O9), and which would leave the tree evals in `watch` prove-only until it passes. Which do you want?
2. **PostHog.** Which region, US or EU, and may I use an existing project or should staging get a new one? May a 🖥️
   Local thread use a project token for staging, and a project-scoped personal key with the fewest read scopes for
   reading, only for this, kept in your keychain and never printed or written? I make no token and no account.
3. **Axiom.** Sign up (free Personal plan, no card) or give me the organisation. Region: US East 1 or EU Central 1; it
   can never be changed; I recommend US East 1. May the same 🖥️ thread use two tokens you create in Axiom: a basic
   ingest token scoped to the staging traces and logs datasets, and an advanced query-only token on them with a dollar
   cap, kept the same way?
4. **Datasets by hand or by deploy?** Axiom may need an admin token to create datasets. I recommend you create the staging
   and production pairs by hand once for now.
5. **Keep everything?** Production could sample. At today's scale I recommend keeping every trace.

## Records of what is not known

Marked here so nothing reads as fact. Axiom: that it accepts our JSON OTLP (implied by Cloudflare's own exporter, not
tested); the APL attribute paths; whether it links logs to traces; a service map; ingest-to-query lag; query rate
limits; whether its MCP has a count of tools beyond the three categories read. PostHog: whether its OTLP traces and
logs accept JSON (Effect also has a protobuf serialiser); how `$exception` should arrive over OTLP; which attributes
and span order its trace store keeps; its real free allowance (10 GB or 50 GB, two pages disagree); whether a span query
API exists outside the MCP tools. Everywhere: whether a failed Effect span marks refusals as errors today; Cloudflare's
built-in export merging with our spans; Grafana anonymous mode; the viewer's start-up time. None blocks L2.O1 to L2.O6;
the vendor ones are answered by L2.O7 and L2.O8's first real sends.

## Sources (read 16 November 2026)

Axiom: `axiom.co/docs/send-data/opentelemetry`, `/reference/tokens`, `/reference/edge-deployments`, `/restapi/query`,
`/query-data/traces`, `/console/intelligence/mcp-server`, `/monitor-data/monitors`, `axiom.co/pricing`. PostHog:
`posthog.com/docs/tracing/start-here`, `/docs/logs`, `/docs/logs/installation`, `/docs/error-tracking/capture`,
`/docs/model-context-protocol`, `/docs/model-context-protocol/tools`, `/docs/model-context-protocol/faq`,
`posthog.com/pricing`. Cloudflare: `developers.cloudflare.com/workers/observability/opentelemetry-export/` and
`/exporting-opentelemetry-data/`, and its PostHog destination page (logs only). Grafana:
`grafana.com/docs/opentelemetry/docker-lgtm/`. Image tags and digests: Docker Hub `grafana/otel-lgtm`. Collector:
`opentelemetry-collector-releases` v0.164.0. Effect: `OtlpTracer.ts:57` (`headers`), `OtlpSerialization.ts`
(`layerJson`, `layerProtobuf`). The local spike: `spikes/local-trace-viewer/`.

## Amendment, 16 November 2026 (the conductor): use the datasets Aaron already has

Aaron's Axiom organisation already has a dataset layout, which replaces the proposed `<project>-<env>-<signal>`
names. Each group is an Axiom correlation group (logs, traces, metrics linked for investigation):

| Group | Datasets | What goes there |
|---|---|---|
| `capxul-test` | `-traces`, `-logs`, `-metrics`, `-events` | test worlds: local, `test` and CI runs |
| `capxul-real` | `-traces`, `-logs`, `-metrics`, `-events` | real worlds: staging and production, told apart by `deployment.environment` |
| `capxul-agents` | `-traces`, `-logs`, `-metrics` | agent sessions (the harness, H1/H2) |
| `capxul-cloudflare` | `-traces`, `-logs` | Cloudflare Workers' own platform export, kept apart from ours |

The `-events` datasets hold product events as flat, typed fields (the blueprint's declared events), not OTLP.

The organisation id and the region are not secrets, but this repository is public, so neither is written in it: the
Axiom sink reads `AXIOM_ORG_ID` and the token by name from the keychain (`security find-generic-password -a architect
-s <name> -w`), and `architect.config.ts` names only the dataset group.

The organisation's edge deployment is EU Central 1, so ingest and query go to that edge's domain, not
`api.axiom.co`. The sink reads the domain by name too (`axiom-domain` in the keychain, or `AXIOM_DOMAIN`), and the
MCP server for supervised sessions is `https://mcp.eu.axiom.co/mcp`, which keeps query results in the EU.

Aaron's tokens already exist, one per dataset group, each in the keychain under its own name: `capxul-ingest-test`
(capxul-test-*), `capxul-ingest-real` (capxul-real-*), `capxul-ingest-agents` (capxul-agents-*),
`capxul-ingest-cloudflare` (capxul-cloudflare-*), all ingest-only, and `capxul-query`, query-only with a cost cap of
$1 an hour and $5 a day, for `watch`. The sink reads them by those service names; `axiom-org-id` and `axiom-domain`
hold the organisation and its EU Central 1 edge.

## Aaron's call, 16 November 2026: Axiom only for now

"Let's leave PostHog for now." The default sink list is Axiom (traces, logs and defects, defects found by their span
status and `defect` tag through an Axiom monitor) plus the local viewer. The `Sink` seam stays, so PostHog is one
adapter added later by config; L2.O8 and L2.O9 move to `later.md`.
