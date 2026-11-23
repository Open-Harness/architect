// One trace for a trace page, scrubbed. Pure. Each span is copied field by field from a whitelist of structural attributes: a payload value, an
// answer value, a statement, a person and a log body have no field to land in, and a log is only counted.
import type { TraceSpanView, TraceView, WindowSpan, WindowTrace } from "../types.ts";

const text = (value: unknown): string | null => (typeof value === "string" ? value : null);

export const traceOf = (trace: string, found: WindowTrace): TraceView => {
  const byId = new Map(found.spans.map((s) => [s.spanId, s]));
  const logs = new Map<string, number>();
  for (const log of found.logs) logs.set(log.spanId, (logs.get(log.spanId) ?? 0) + 1);
  const depthOf = (span: WindowSpan): number => {
    let depth = 0;
    const seen = new Set<string>([span.spanId]);
    for (let at = byId.get(span.parentSpanId); at !== undefined && !seen.has(at.spanId); at = byId.get(at.parentSpanId)) { depth += 1; seen.add(at.spanId); }
    return depth;
  };
  const attemptOf = (span: WindowSpan): number | null => {
    const seen = new Set<string>();
    for (let at: WindowSpan | undefined = span; at !== undefined && !seen.has(at.spanId); at = byId.get(at.parentSpanId)) {
      if (typeof at.attrs["attempt"] === "number") return at.attrs["attempt"];
      seen.add(at.spanId);
    }
    return null;
  };
  const spans = [...found.spans].sort((a, b) => a.start - b.start || (a.spanId < b.spanId ? -1 : 1)).map((span): TraceSpanView => {
    const refusal = text(span.attrs["refusal"]);
    return {
      span: span.spanId, name: span.name, depth: depthOf(span), attempt: attemptOf(span), start: span.start, ms: span.ms,
      outcome: refusal !== null ? "refused" : span.status === 2 ? "error" : "ok", refusal,
      stepKind: text(span.attrs["step.kind"]), commit: text(span.attrs["commit.outcome"]), move: text(span.attrs["move.name"]), event: text(span.attrs["event.name"]),
      logs: logs.get(span.spanId) ?? 0,
    };
  });
  return { trace, spans };
};
