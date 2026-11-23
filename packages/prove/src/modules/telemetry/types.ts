// Telemetry for prove: a real OpenTelemetry Collector as a pinned binary, its file exporter read back by trace id
// (spikes/otlp-from-workerd). What a call did is read from here, never from what the server says about itself.
import { Data, type Effect, type Scope } from "effect";
import type { Env, Reader } from "#modules/sinks/types.js";

export interface Span {
  readonly traceId: string;
  readonly spanId: string;
  readonly parentSpanId: string;
  readonly name: string;
  readonly attrs: Readonly<Record<string, unknown>>;
  /** 0 unset, 1 ok, 2 error. */
  readonly status: number;
  readonly ms: number;
  /** When it started, in milliseconds since the epoch: the order steps ran in. */
  readonly start: number;
}

export interface Log {
  readonly traceId: string;
  readonly spanId: string;
  readonly body: string;
  readonly attrs: Readonly<Record<string, unknown>>;
}

export interface Trace {
  readonly spans: ReadonlyArray<Span>;
  readonly logs: ReadonlyArray<Log>;
}

export class CollectorFailed extends Data.TaggedError("CollectorFailed")<{ readonly message: string }> {}

/** A source that couldn't be read: no credential for it, an edge that wouldn't answer, an answer it refused. Never carries a value. */
export class SourceFailed extends Data.TaggedError("SourceFailed")<{ readonly message: string }> {}

/**
 * The first 8 hex characters of every caller span id `prove` makes up for a call's `traceparent`. A trace whose spans point at
 * a parent that starts so was made by a prove run, which judged it already: `watch` leaves it out of what it counts.
 */
export const PROVE_SPAN_PREFIX = "a2c4e700";

/** A trace some caller is waiting on: found by its id, complete once the span that is the caller's child is there. */
export interface Wanted {
  readonly trace: string;
  /** The caller's own span id, from the `traceparent` it sent: the server's root span is its child. */
  readonly parent: string;
  /** The caller's span is itself in the trace (the journey's `journey.<name>`): complete only once it is. */
  readonly rooted?: boolean;
  /**
   * The server may send nothing for this call: it refused the caller before any span opened (O2, gap 3). An empty
   * trace is then whole. One with spans is still waited for, so a span that should be absent is seen.
   */
  readonly mayBeEmpty?: boolean;
}

/**
 * Where traces are read from. `prove`, `telemetry trace` and, later, `watch` read through this and never through a
 * file or a vendor directly (O1): a `FileSource` today, an Axiom one in the cloud pass.
 */
export interface TraceSource {
  /**
   * Every span and log of these traces, once each is complete: its root span (the child of the caller's span) is
   * present, no span points at a parent that isn't, and nothing new has arrived for a quiet window. A trace still
   * incomplete after 10 s comes back as it is; the evals then name what is missing.
   */
  readonly traces: (wanted: ReadonlyArray<Wanted>) => Effect.Effect<ReadonlyMap<string, Trace>>;
  /** One trace by id, as it is now: no waiting, `undefined` when this source has none of it. */
  readonly find: (trace: string) => Effect.Effect<Trace | undefined>;
  /**
   * Every trace with a span that started in the last `since` milliseconds (`now` is the clock's, unless given), whole: what
   * `watch` judges. It reads what the source has, without waiting for anything to complete.
   */
  readonly window: (since: number, now?: number) => Effect.Effect<ReadonlyMap<string, Trace>, SourceFailed>;
}

/** One series of a metric over a window: its labels, and how much it grew in the window. */
export interface MetricPoint {
  readonly name: string;
  readonly labels: Readonly<Record<string, string>>;
  readonly value: number;
}

/** Where metrics are read from, beside `TraceSource` (portal.md hole 2): `ortho.calls` counted in the last `since` ms before `now`. History past the window is M7.14. */
export interface MetricsSource {
  readonly window: (since: number, now: number) => Effect.Effect<ReadonlyArray<MetricPoint>, SourceFailed>;
}

export interface FileMetricsApi {
  /** Read the counters in `metrics.jsonl` of these folders, as one source. Missing files are no points, not a failure. */
  readonly open: (dirs: string | ReadonlyArray<string>) => MetricsSource;
}

export interface Collector extends TraceSource {
  /** The OTLP/HTTP base URL the Worker exports to. */
  readonly url: string;
}

export interface CollectorsApi {
  /** A scoped loopback OTLP/HTTP receiver, writing scrubbed OTLP JSON lines to `dir`. */
  readonly local: (dir: string, strip: ReadonlyArray<string>) => Effect.Effect<Collector, CollectorFailed, Scope.Scope>;
  /**
   * Start a collector process writing to `dir`, owned by this one: stopped when the scope closes. First stops every collector whose
   * owner process is gone (a killed prove's leak). `strip` are attribute keys its `attributes` processor deletes from every span
   * and log (L2.P): the keys the model says may carry a non-public value.
   */
  readonly start: (dir: string, options?: { readonly strip?: ReadonlyArray<string> }) => Effect.Effect<Collector, CollectorFailed, Scope.Scope>;
  /**
   * A collector that outlives this process, for an environment that has one of its own: a detached process writing to a fresh
   * `dir`, on a port the system picks, its marker kept in `dir`. Returns its OTLP/HTTP URL. Whoever launches it stops it.
   */
  readonly launch: (options: { readonly dir: string; readonly strip?: ReadonlyArray<string> }) => Effect.Effect<string, CollectorFailed>;
  /** Stop the collector launched in `dir`, if it still runs what was launched. Nothing to stop is not an error. */
  readonly stop: (dir: string) => Effect.Effect<void>;
  /** Read what some collector wrote to `dir`, by trace id. */
  readonly read: (dir: string) => TraceSource;
}

export interface AxiomSourceApi {
  /**
   * Axiom's query API as a source: APL over the dataset `<group>-traces` (and `<group>-logs`, for the logs of refused calls),
   * the spans of `environment` told apart by `deployment.environment`. The query token is `AXIOM_QUERY_TOKEN`, else the keychain
   * item `capxul-query`; the edge `AXIOM_DOMAIN`, else `axiom-domain`; the organisation `AXIOM_ORG_ID`, else `axiom-org-id`. Each is
   * read here, held for the queries and never printed or written. `fetch` is a seam for tests.
   */
  readonly open: (options: {
    readonly group: string;
    readonly environment: string;
    readonly env: Env;
    readonly read?: Reader;
    readonly fetch?: typeof fetch;
  }) => Effect.Effect<TraceSource, SourceFailed>;
}

export interface FileSourceApi {
  /** Read OTLP JSON lines (`traces.jsonl`, `logs.jsonl`) from these folders, as one source. */
  readonly open: (dirs: string | ReadonlyArray<string>) => TraceSource;
}
