// Reading the collector's file exporter: OTLP JSON, one export per line.
import { existsSync, readFileSync } from "node:fs";
import type { Log, Span, Trace, Wanted } from "../types.ts";

const value = (v: any): unknown =>
  v === undefined ? undefined
  : "stringValue" in v ? v.stringValue
  : "intValue" in v ? Number(v.intValue)
  : "boolValue" in v ? v.boolValue
  : "doubleValue" in v ? v.doubleValue
  : "arrayValue" in v ? (v.arrayValue.values ?? []).map(value)
  : JSON.stringify(v);
const attrs = (kvs: ReadonlyArray<any> = []) => Object.fromEntries(kvs.map((kv) => [kv.key, value(kv.value)]));

export const spansOf = (doc: any): Array<Span> =>
  (doc.resourceSpans ?? []).flatMap((rs: any) =>
    (rs.scopeSpans ?? []).flatMap((ss: any) =>
      (ss.spans ?? []).map((s: any): Span => ({
        traceId: s.traceId, spanId: s.spanId, parentSpanId: s.parentSpanId ?? "", name: s.name, attrs: attrs(s.attributes),
        status: s.status?.code ?? 0, ms: Number(BigInt(s.endTimeUnixNano) - BigInt(s.startTimeUnixNano)) / 1e6,
        start: Number(BigInt(s.startTimeUnixNano) / 1000n) / 1e3,
      }))));

export const logsOf = (doc: any): Array<Log> =>
  (doc.resourceLogs ?? []).flatMap((rl: any) =>
    (rl.scopeLogs ?? []).flatMap((sl: any) =>
      (sl.logRecords ?? []).map((l: any): Log => {
        const body = value(l.body);
        return { traceId: l.traceId ?? "", spanId: l.spanId ?? "", body: Array.isArray(body) ? body.join(" ") : String(body), attrs: attrs(l.attributes) };
      })));

const text = (path: string): string => (existsSync(path) ? readFileSync(path, "utf8") : "");

/** Whole lines only: the exporter may be mid-line, and the next read sees that line complete. */
const docs = (content: string): Array<any> => content.split("\n").slice(0, -1).filter((l) => l.trim() !== "").map((l) => JSON.parse(l));

/** Everything the collector has written so far to these folders, by trace id, and how many bytes that was. */
export const readAll = (dirs: ReadonlyArray<string>): { readonly byTrace: Map<string, Trace>; readonly size: number } => {
  const byTrace = new Map<string, { spans: Array<Span>; logs: Array<Log> }>();
  const at = (id: string) => byTrace.get(id) ?? byTrace.set(id, { spans: [], logs: [] }).get(id)!;
  let size = 0;
  for (const dir of dirs) {
    const traces = text(`${dir}/traces.jsonl`);
    const logs = text(`${dir}/logs.jsonl`);
    size += traces.length + logs.length;
    for (const d of docs(traces)) for (const s of spansOf(d)) at(s.traceId).spans.push(s);
    for (const d of docs(logs)) for (const l of logsOf(d)) at(l.traceId).logs.push(l);
  }
  return { byTrace, size };
};

/**
 * Root present (the span whose parent is the caller's), and no span pointing at a parent that isn't there. A span
 * with no parent at all is a root of its own: the journey's span, when prove exported it. `rooted` waits for it.
 */
export const looksComplete = (trace: Trace | undefined, parent: string, rooted = false): boolean => {
  if (!trace) return false;
  const ids = new Set(trace.spans.map((s) => s.spanId));
  const linked = trace.spans.some((s) => s.parentSpanId === parent) && trace.spans.every((s) => s.parentSpanId === "" || s.parentSpanId === parent || ids.has(s.parentSpanId));
  return linked && (!rooted || ids.has(parent));
};

/** Whether what a source holds of a wanted trace is all that will come: complete, or empty when it may be. */
export const arrived = (trace: Trace | undefined, wanted: Wanted): boolean =>
  (wanted.mayBeEmpty === true && (trace === undefined || trace.spans.length === 0)) || looksComplete(trace, wanted.parent, wanted.rooted);
