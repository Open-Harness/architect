# telemetry

`ortho telemetry trace <id>` (O1, D3 #100 to #104).

- `trace <id> [--env local|test]` prints the trace as a tree with its logs, read from the files the Collector wrote
  through a `TraceSource` (a `FileSource`). A declared refusal is `refused <Tag>`, a defect is `✘ defect: …`. It needs
  no viewer, so it works over SSH and is the surface for an agent. `--env` narrows it to prove's folder or an
  environment's own.

The Grafana viewer (`ortho telemetry view | stop | open`, `prove --view`) went with Docker (K10 section 8, M1.33): the
portal's trace view replaces it, and `trace` reads the same files until that page exists.

The module returns what to say (`Said`); only `main.ts` prints or exits. Test: `telemetry.test.ts`.
