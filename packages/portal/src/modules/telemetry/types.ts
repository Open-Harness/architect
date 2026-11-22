// What a portal reads of its environment's live traffic, and the shape it puts on the wire for the client (M1.13, portal.md holes 2 and 7).
// Two reads feed it: the window's spans (`TraceSource.window`, structural here so the portal never depends on `prove`) and the window's
// metrics (`ortho.calls`, through a local metrics reader). Everything on the wire is derived and scrubbed here, on the server: a statement, a
// person's id, a payload value or a log body is never carried, so no page can draw one.
import type { Effect } from "effect";
import type { Availability, BlueprintWire } from "#modules/wire/types.js";

// ---- what is read (structural: `prove`'s `TraceSource` and a metrics source fit) ----

/** A source that could not be read. Its message never carries a value. */
export interface WindowFailure { readonly message: string }

export interface WindowSpan {
  readonly spanId: string;
  readonly parentSpanId: string;
  readonly name: string;
  readonly attrs: Readonly<Record<string, unknown>>;
  /** 0 unset, 1 ok, 2 error. */
  readonly status: number;
  readonly ms: number;
  readonly start: number;
}
/** A log is only ever counted: its body and attributes are not part of this type. */
export interface WindowLog { readonly spanId: string }
export interface WindowTrace { readonly spans: ReadonlyArray<WindowSpan>; readonly logs: ReadonlyArray<WindowLog> }

export interface TraceWindow {
  /** Every trace with a span that started in the last `since` ms before `now`. `now` is always passed: the portal reads no clock. */
  readonly window: (since: number, now: number) => Effect.Effect<ReadonlyMap<string, WindowTrace>, WindowFailure>;
  readonly find: (trace: string) => Effect.Effect<WindowTrace | undefined, WindowFailure>;
}

/** One series of a metric over the window: its labels, and how much it grew in the window. */
export interface MetricPoint { readonly name: string; readonly labels: Readonly<Record<string, string>>; readonly value: number }
export interface MetricsWindow {
  readonly window: (since: number, now: number) => Effect.Effect<ReadonlyArray<MetricPoint>, WindowFailure>;
}

/** What `PortalContext.live` is: the environment this portal reads, its two sources, and the only clock there is. */
export interface PortalLive {
  readonly environment: string;
  readonly source: TraceWindow;
  readonly metrics: MetricsWindow;
  /** The window's end, in ms since the epoch. A later `now` moves the window; nothing else does. */
  readonly now: number;
  readonly windowMs: number;
}

// ---- what is put on the wire ----

/** Derived, never the person's id: a span with `principal.person` is a person; `principal.kind` `agent` an agent; `anonymous` anyone. */
export type CallerKind = "person" | "agent" | "anyone" | "unknown";
/** `unknown`: attempts without a `call.id` that two or more calls could each have been (O3). Its row says so, and it counts no move. */
export type Outcome = "answered" | "refused" | "defect" | "unknown";

/** One call (a retry is one call, however many attempts it took): one row of the calls table and one entry of the rail's last calls. */
export interface TelemetryCall {
  readonly trace: string;
  readonly operation: string;
  /** The first attempt's start, ms since the epoch. */
  readonly start: number;
  readonly outcome: Outcome;
  /** The declared refusal's name (map it to its code with `model.refusals`), when `outcome` is `refused`. */
  readonly refusal: string | null;
  readonly caller: CallerKind;
  /** How many attempts it took (retries after a lost commit). */
  readonly attempts: number;
  /** The extent of its attempt spans: the first's start to the last's end (portal.md, "Calls table vs spans"). */
  readonly durationMs: number;
  readonly environment: string;
  /** `durationMs` is over the operation's declared `budget.p95Ms` (false when it declares none). */
  readonly overBudget: boolean;
  /** The journey whose run made it, when the trace is a journey's. */
  readonly journey: string | null;
  /** The idempotency key the call was made with: `request.key` on an attempt's span (M1.12a, portal.md hole 1), null when it was made with none. */
  readonly requestKey: string | null;
  /** The role the caller held. Nothing carries it yet (portal.md hole 8): always null, and the page says `not yet`. */
  readonly roleHeld: null;
}

/** From the spans of the window. */
export interface CallsView {
  /** Newest first, at most `ROWS_MAX`; a call that opened no span (a refusal at the door) is never a row. */
  readonly rows: ReadonlyArray<TelemetryCall>;
  /** How many calls the window held beyond `rows`. */
  readonly truncated: number;
  /** Per operation: answered calls whose committed attempt carried `move.name`. The operation's move is `model.operations[op].move.key`. */
  readonly moves: Readonly<Record<string, number>>;
  /** Per operation: the journeys whose runs called it (sorted). */
  readonly journeys: Readonly<Record<string, ReadonlyArray<string>>>;
}

export interface OperationCounts {
  readonly calls: number;
  readonly answered: number;
  /** Door refusals included. */
  readonly refused: number;
  readonly defects: number;
  /** Per declared refusal, how many `ortho.calls` counted. */
  readonly refusals: Readonly<Record<string, number>>;
  /** Refusals counted by `ortho.calls` that no span in the window accounts for: counted, named, never a row. Null when the spans could not be read. */
  readonly doorRefusals: number | null;
}

export interface RefusalCounts {
  readonly count: number;
  /** Of `count`, the ones that opened no span. Null when the spans could not be read. */
  readonly door: number | null;
  /** The newest call refused with it that has a span (a row opens it), or null. */
  readonly trace: string | null;
}

/** From `ortho.calls`. */
export interface CountsView {
  /** Every declared operation, zeros where the window saw none. */
  readonly operations: Readonly<Record<string, OperationCounts>>;
  /** Every declared refusal, by name, summed over operations. */
  readonly refusals: Readonly<Record<string, RefusalCounts>>;
}

/** The snapshot's `telemetry`; null in a portal with no live source. A source that fails is `unavailable` with its reason: what it would have filled is absent, never zero. */
export interface PortalTelemetry {
  readonly environment: string;
  /** The window's end: the only clock a page may show. */
  readonly now: number;
  readonly windowMs: number;
  /** `now - windowMs`. */
  readonly since: number;
  readonly metrics: Availability<CountsView>;
  readonly calls: Availability<CallsView>;
}

/** One span of a trace page: structure, timing and outcome. Never a payload value, an answer value, a statement, a person or a log body. */
export interface TraceSpanView {
  readonly span: string;
  readonly name: string;
  readonly depth: number;
  /** Of the attempt it belongs to (its own, or its nearest ancestor's), or null above the attempts. */
  readonly attempt: number | null;
  readonly start: number;
  readonly ms: number;
  readonly outcome: "ok" | "error" | "refused";
  readonly refusal: string | null;
  /** `step.kind`, when it is a step. */
  readonly stepKind: string | null;
  /** `commit.outcome`, on a commit span. */
  readonly commit: string | null;
  readonly move: string | null;
  readonly event: string | null;
  /** How many logs it has. Counted, never read. */
  readonly logs: number;
}
export interface TraceView { readonly trace: string; readonly spans: ReadonlyArray<TraceSpanView> }

export interface TelemetryApi {
  /** Never fails: a source that cannot be read is a value inside the answer. */
  readonly read: (blueprint: BlueprintWire, live: PortalLive) => Effect.Effect<PortalTelemetry>;
  /** One trace, scrubbed: `undefined` when the source has none of it. */
  readonly trace: (live: PortalLive, trace: string) => Effect.Effect<Availability<TraceView | undefined>>;
}

/** The most rows the calls table is sent. */
export const ROWS_MAX = 500;
