// The calls of a window, from its spans. Pure. A call is one operation's attempts, grouped by the `call.id` the runtime wrote on each (`group.ts`): a retry
// is one call, and two calls to one operation under one trace (a client reusing its traceparent) are two. A journey's own
// span, a step span and a commit span are not attempts. Nothing is read from a span but a whitelist of structural attributes.
import type { CallerKind, CallsView, MonitoredCall, Outcome, TelemetryCall, WindowSpan, WindowTrace } from "../types.ts";
import { ROWS_MAX } from "../types.ts";
import { failureOf } from "./failure.ts";
import { CALL_ID, groupCalls, numberOf, type CallGroup } from "./group.ts";
import { isAttempt, spanKind, type OperationKinds, type OperationSteps } from "./spans.ts";

const text = (value: unknown): string | undefined => (typeof value === "string" ? value : undefined);

/** The caller's kind, never the person: `principal.person` is a person; `principal.kind` says the rest. */
export const callerOf = (span: WindowSpan): CallerKind | undefined => {
  if (typeof span.attrs["principal.person"] === "string") return "person";
  const kind = text(span.attrs["principal.kind"]);
  return kind === "agent" ? "agent" : kind === "anonymous" ? "anyone" : kind === "person" ? "person" : undefined;
};

const round = (n: number) => Math.round(n * 1000) / 1000;

/**
 * The last attempt decides. A conflict is no refusal and ends its span ok, so a call whose final attempt's commit conflicted (the retries ran out:
 * the loop dies outside the attempt span, and `ortho.calls` counts a defect) committed nothing and is a defect, never an answer.
 */
const outcomeOf = (last: WindowSpan, spans: ReadonlyArray<WindowSpan>): { readonly outcome: Outcome; readonly refusal: string | null } => {
  const refusal = text(last.attrs["refusal"]);
  if (refusal !== undefined) return { outcome: "refused", refusal };
  const conflicted = spans.some((s) => s.parentSpanId === last.spanId && s.attrs["step.kind"] === "commit" && s.attrs["commit.outcome"] === "conflict");
  return { outcome: last.status === 2 || conflicted ? "defect" : "answered", refusal: null };
};

/** The runtime's `call.id` when every attempt carries the same one; otherwise the trace and the attempts' own span ids. Never a time. */
const identityOf = (trace: string, attempts: ReadonlyArray<WindowSpan>): string => {
  const ids = new Set(attempts.map((s) => text(s.attrs[CALL_ID])));
  const [only] = [...ids];
  return ids.size === 1 && only !== undefined ? only : `${trace}/${attempts.map((s) => s.spanId).sort().join(",")}`;
};

const callOf = (trace: string, operation: string, { spans: attempts, unresolved }: CallGroup, all: ReadonlyArray<WindowSpan>, journey: string | null, environment: string, budget: number | undefined, steps: OperationSteps): MonitoredCall => {
  const ordered = [...attempts].sort((a, b) => numberOf(a) - numberOf(b) || a.start - b.start);
  const first = ordered.reduce((a, b) => (b.start < a.start ? b : a));
  const end = Math.max(...ordered.map((s) => s.start + s.ms));
  const durationMs = round(end - first.start);
  const outcome = unresolved ? { outcome: "unknown" as const, refusal: null } : outcomeOf(ordered[ordered.length - 1]!, all);
  const failure = outcome.outcome === "defect" ? failureOf(ordered, all, operation, steps) : undefined;
  return {
    trace, operation, start: first.start, ...(unresolved ? { outcome: "unknown" as const, refusal: null } : outcomeOf(ordered[ordered.length - 1]!, all)),
    caller: ordered.map(callerOf).find((k) => k !== undefined) ?? "unknown",
    attempts: new Set(ordered.map(numberOf)).size,
    durationMs,
    environment: ordered.map((s) => text(s.attrs["environment"])).find((e) => e !== undefined) ?? environment,
    overBudget: budget !== undefined && durationMs > budget,
    journey, requestKey: ordered.map((s) => text(s.attrs["request.key"])).find((k) => k !== undefined) ?? null, roleHeld: null,
    id: identityOf(trace, ordered),
    ...(failure === undefined ? {} : { failure }),
  };
};

/**
 * A move counts when the attempt that selected it did not lose its commit race. An attempt that selects a move and conflicts took none: its retry may
 * answer with an existing id and no move of its own. A commit span says `conflict`; no commit span at all (the attempt never got that far, or a
 * source that keeps none) is not a lost race.
 */
const moved = (attempts: ReadonlyArray<WindowSpan>, all: ReadonlyArray<WindowSpan>) =>
  attempts.some((a) => typeof a.attrs["move.name"] === "string"
    && !all.some((s) => s.parentSpanId === a.spanId && s.attrs["step.kind"] === "commit" && s.attrs["commit.outcome"] === "conflict"));

/** Per operation, the nearest-rank p95 of every call's duration in the window. */
const p95Of = (all: ReadonlyArray<TelemetryCall>): Readonly<Record<string, number>> => {
  const by = new Map<string, Array<number>>();
  for (const c of all) by.set(c.operation, [...(by.get(c.operation) ?? []), c.durationMs]);
  return Object.fromEntries([...by].map(([op, d]) => { const sorted = [...d].sort((a, b) => a - b); return [op, sorted[Math.ceil(0.95 * sorted.length) - 1]!]; }));
};

/** Calls with a span that were refused, per operation and refusal name, with the newest such trace. */
export type SpanRefusals = ReadonlyMap<string, { readonly operation: string; readonly name: string; readonly count: number; readonly trace: string; readonly start: number }>;

export const callsOf = (traces: ReadonlyMap<string, WindowTrace>, environment: string, budgets: Readonly<Record<string, number | undefined>>, kinds: OperationKinds, steps: OperationSteps, window: { readonly since: number; readonly now: number }): { readonly view: CallsView; readonly refusals: SpanRefusals; readonly all: ReadonlyArray<MonitoredCall> } => {
  const all: Array<MonitoredCall> = [];
  const moves: Record<string, number> = {};
  const journeys: Record<string, Set<string>> = {};
  for (const [trace, { spans }] of traces) {
    const journey = spans.map((s) => text(s.attrs["journey"])).find((j) => j !== undefined) ?? null;
    const byOperation = new Map<string, Array<WindowSpan>>();
    for (const span of spans.filter((span) => isAttempt(spanKind(span, kinds)))) byOperation.set(String(span.attrs["operation"]), [...(byOperation.get(String(span.attrs["operation"])) ?? []), span]);
    for (const [operation, every] of byOperation) {
      for (const group of groupCalls(every, spans)) {
        const call = callOf(trace, operation, group, spans, journey, environment, budgets[operation], steps);
        // The window is the call's: a source hands back whole traces, and a long trace holds calls from before it (and, at a fixed `now`, after it).
        if (call.start < window.since || call.start > window.now) continue;
        all.push(call);
        if (call.outcome === "answered" && moved(group.spans, spans)) moves[operation] = (moves[operation] ?? 0) + 1;
        if (journey !== null) (journeys[operation] ??= new Set()).add(journey);
      }
    }
  }
  // Newest first; a tie falls to the trace and the operation, so two reads of the same window are the same bytes.
  all.sort((a, b) => b.start - a.start || (a.trace < b.trace ? -1 : a.trace > b.trace ? 1 : a.operation < b.operation ? -1 : 1));
  const refusals = new Map<string, { operation: string; name: string; count: number; trace: string; start: number }>();
  for (const call of all) {
    if (call.refusal === null) continue;
    const key = `${call.operation}\u0000${call.refusal}`;
    const held = refusals.get(key);
    refusals.set(key, { operation: call.operation, name: call.refusal, count: (held?.count ?? 0) + 1, ...(held !== undefined && held.start >= call.start ? { trace: held.trace, start: held.start } : { trace: call.trace, start: call.start }) });
  }
  return {
    view: {
      p95: p95Of(all),
      rows: all.slice(0, ROWS_MAX).map(({ id: _id, failure: _failure, ...row }) => row), truncated: Math.max(0, all.length - ROWS_MAX), moves,
      journeys: Object.fromEntries(Object.entries(journeys).map(([op, set]) => [op, [...set].sort()])),
    },
    refusals,
    all,
  };
};
