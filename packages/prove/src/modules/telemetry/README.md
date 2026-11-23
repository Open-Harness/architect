# telemetry

`Collectors.local(dir, strip)` receives local prove's traces, logs and metrics on a scoped loopback port. It applies
the same private and personal attribute guard before writing JSON lines for `FileSource`.

`Collectors.start(dir)`: a real OpenTelemetry Collector as a process (M1.33, K10 section 8): the pinned `otelcol-contrib`
0.164.0 from the official opentelemetry-collector-releases, fetched once, checked against the SHA-256 pinned in
`internal/binary.ts` and cached outside the repository (`ORTHO_CACHE_DIR`, else `~/.cache/orthograph`; `ORTHO_COLLECTOR_BIN`
names a binary of your own). Its OTLP/HTTP receiver is on a loopback port the system picks, its file exporter writes OTLP JSON
lines to `dir` (flushed every 10 ms) and its own log to `dir/collector.log`. Stopped when the scope closes. `traces(wanted)`
reads each trace back once complete, by the rule from `spikes/otlp-from-workerd`: root span present, no dangling parents,
then quiet for 250 ms; 10 s at most, after which the evals name what is missing. Test: `telemetry.test.ts`.

`Collectors.launch({ dir })`, `.stop(dir)` and `.read(dir)` are the same collector for an environment that has one of its
own (D3 #52): a detached process, launched without a scope, stopped by whoever launched it and read back from its folder
by whoever proves against the environment.

**Owned by PID.** Each process leaves a marker in the run folder (`ORTHO_RUN_DIR`, else `~/.cache/orthograph/run`): its PID,
its owner and the command it was started with (`internal/runs.ts`). A process is signalled only while `ps` still shows that
command for the PID, so a recycled PID is never hit. A gate points `ORTHO_RUN_DIR` at a folder of its own, and whatever
that folder still names alive when the gate ends is a leak (`e2e/layer1/teardown.ts`).

`Collectors.start(dir, { strip })` and `launch({ …, strip })` add an `attributes` processor that deletes each key in `strip` from every
span and log before the file exporter (L2.P, D3 #82): the second guard behind the runtime's allowlist. `privateKeys(model)` builds the keys
from the model's `visibility`; `prove` and `env up` pass it. Test: `prove/secrets.test.ts`, against the real Collector's files.

L2.O (O1, D3 #100 to #109, #120, #121): `TraceSource` is the seam prove reads through (`traces(wanted)`, which waits until complete, and `find(id)`), and
`FileSource.open(dirs)` is the one over the Collector's files. Before any `start` or `launch`, collectors whose owner process is gone
are stopped (a killed prove's leak). Every pipeline first
deletes `user.*` and `organization.id` (the agent SDK's records name the signed-in person), then the model's private keys (L2.P). `rootOf`
and `exportRoots` make and send the journey's own span, `journey.<name>`, built from the spans the server recorded for the call.

L2.09 (D3 #140 to #143): `TraceSource` gains `window(since, now?)`, every trace with a span newer than the window, whole, read without waiting: what
`watch` judges. `FileSource.window` reads the Collector's files against the clock (`Clock`, never `Date.now`). `AxiomSource.open({ group,
environment, env })` is the one over Axiom's query API: APL over `<group>-traces` filtered by `deployment.environment`, spans from the columns
`attributes.custom`, `status.code`, `_time` and `duration`, and the logs of refused calls from `<group>-logs`; the query token, edge and organisation
are read by name (`AXIOM_QUERY_TOKEN` / `capxul-query`, `AXIOM_DOMAIN` / `axiom-domain`, `AXIOM_ORG_ID` / `axiom-org-id`) and kept in memory for the queries only.
The window stops 15 s short of now (Axiom takes a span some seconds after it ended) and reads at most 50 000 spans. Prove's own calls carry a caller
span id that starts with `PROVE_SPAN_PREFIX`, which is how `watch` tells them from traffic. Tests: `sources.test.ts` (a stand-in for the query API),
and `watch/watch.live.test.ts` against Axiom with `ORTHO_LIVE_AXIOM=1`.

Portal hole 2 (M1.13): `FileMetrics.open(dirs).window(since, now)` is the metrics reader beside `TraceSource`: the counters of `metrics.jsonl` (`ortho.calls`), each series answered as how much it grew in the window, whether the exporter used delta or cumulative totals (a total that fell is a restart). A missing file is no points; an unreadable one is a `SourceFailed`. History past the window is M7.14. Test: `metrics.test.ts`.
