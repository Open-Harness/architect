// Telemetry sinks: where an environment's traces and logs go. The core speaks only OpenTelemetry (O1); a sink is a
// destination named in `blueprint/environments/<env>.ts`, as a list, so one sink or several is the same line.

/** The Collector prove and `env up` start, as a process. Needs no credential. */
export interface LocalSink {
  readonly kind: "sink";
  readonly which: "local";
}

/**
 * Axiom, by dataset group: `<group>-traces` and `<group>-logs` receive the spans and logs. The token, the edge domain
 * and the organisation are read by name from the machine's keychain (or `AXIOM_TOKEN`, `AXIOM_DOMAIN` in CI); none of
 * them is written here, because the repository is public.
 */
export interface AxiomSink {
  readonly kind: "sink";
  readonly which: "axiom";
  readonly group: string;
}

export type Sink = LocalSink | AxiomSink;

export interface TelemetryApi {
  readonly sink: {
    readonly local: () => Sink;
    readonly axiom: (spec: { readonly group: string }) => Sink;
  };
}
