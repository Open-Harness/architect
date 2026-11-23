// Telemetry from a Worker: each request gets its own OTLP exporters, flushed after the response under `waitUntil`
// (spikes/otlp-from-workerd). Every response carries `x-trace-id`; a caller's `traceparent` is kept.
import type { Context } from "effect";

export type WebHandler = (request: Request, context?: Context.Context<never>) => Promise<Response>;

/** One OTLP/HTTP endpoint: where a signal goes, and the headers it needs (an Axiom token and dataset, say). */
export interface Endpoint {
  readonly url: string;
  readonly headers: Readonly<Record<string, string>>;
}

/** A destination for telemetry: the local Collector, or a sink the environment names. */
export interface Exporter {
  readonly id: string;
  readonly traces: Endpoint;
  readonly logs: Endpoint;
  readonly metrics?: Endpoint | undefined;
}

export interface TelemetryApi {
  /**
   * What the environment adds to the Collector: its sinks (`OTLP_SINKS`) and its name (`ORTHO_ENVIRONMENT`). Bindings
   * never change within an isolate, so the generated Worker says it once per request, on a line of its own, and
   * `serve` keeps its own call as it was.
   */
  readonly configure: (options: { readonly sinks: string | undefined; readonly environment: string | undefined }) => void;
  readonly serve: (options: {
    /** The local Collector's OTLP/HTTP base URL. Unset and with no sinks: no export, but trace ids still flow. */
    readonly url: string | undefined;
    /** The environment's sinks beside the Collector, as JSON (`OTLP_SINKS`): each one's endpoints and headers. */
    readonly sinks?: string | undefined;
    /** The environment's name, written on every span's resource as `deployment.environment`. */
    readonly environment?: string | undefined;
    readonly service: string;
    readonly handler: WebHandler;
    readonly waitUntil: (promise: Promise<unknown>) => void;
  }, request: Request) => Promise<Response>;
}
