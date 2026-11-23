# telemetry

`Telemetry.serve` runs a web handler with per-request OTLP trace, log and metric exporters. It disposes them under
`waitUntil` so they flush after the response. It keeps or mints a `traceparent` and answers with `x-trace-id`. With no
destinations configured, only the trace headers flow. Test: `telemetry.test.ts`.

L2.O: `Telemetry.serve` also takes `sinks` (`OTLP_SINKS`, JSON: each sink's endpoints and headers) and `environment`
(`deployment.environment` on each exported resource). One `Fetch` fans each export out to the local Collector and every
sink, each with its own headers; one failing never fails the others. Everything sent to a sink has `user.*`, `organization.id` and `*.email`
attributes removed first (D3 #120); the local Collector gets what it was sent. Tests: `telemetry.test.ts`.
