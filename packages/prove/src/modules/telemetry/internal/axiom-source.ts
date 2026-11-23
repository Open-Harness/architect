// Axiom's query API as a TraceSource (O1, D3 #140): APL over `<group>-traces`, and `<group>-logs` for the logs of refused calls.
// The columns are the ones the live check read (D3 #121): a span's own attributes are the map `attributes.custom`, the
// resource's are `resource.custom`, `status.code` is OK / ERROR / UNSET and `_time` is when the span started.
import { Effect, Schedule } from "effect";
import type { Env, Reader } from "#modules/sinks/types.js";
import { Sinks } from "#modules/sinks/service.js";
import { SourceFailed, type AxiomSourceApi, type Log, type Span, type Trace, type TraceSource, type Wanted } from "../types.ts";
import { arrived } from "./otlp.ts";

type Row = Readonly<Record<string, unknown>>;

/** What a query needs, held for the queries of one `open` and nowhere else. */
interface Connection {
  readonly base: string;
  readonly token: string;
  readonly org: string | undefined;
  readonly fetch: typeof fetch;
}

const NAME = /^[A-Za-z0-9][A-Za-z0-9_.-]*$/;
const HEX = /^[0-9a-f]{1,64}$/;
/** Axiom takes a span some seconds after it ended; a window that stops a little short never judges a trace still arriving. */
const LAG_SECONDS = 15;
const SPAN_LIMIT = 50_000;
const LOG_LIMIT = 10_000;
const CHUNK = 100;

const object = (v: unknown): Readonly<Record<string, unknown>> => (typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const text = (v: unknown): string => (typeof v === "string" ? v : "");

const spanOf = (r: Row): Span => ({
  traceId: text(r["trace_id"]), spanId: text(r["span_id"]), parentSpanId: text(r["parent_span_id"]), name: text(r["name"]),
  attrs: object(r["attributes.custom"]),
  status: r["status.code"] === "OK" ? 1 : r["status.code"] === "ERROR" ? 2 : 0,
  ms: Number(r["ms"]) || 0,
  start: Date.parse(text(r["_time"])) || 0,
});
const logOf = (r: Row): Log => ({ traceId: text(r["trace_id"]), spanId: text(r["span_id"]), body: text(r["body"]), attrs: {} });

/** Axiom's tabular answer: `fields` name the columns, each column holds that field's value for every row. */
const rowsOf = (answer: unknown): ReadonlyArray<Row> => {
  const tables = object(answer)["tables"];
  const table = object(Array.isArray(tables) ? tables[0] : undefined);
  const fields = (table["fields"] as ReadonlyArray<{ name: string }> | undefined) ?? [];
  const columns = (table["columns"] as ReadonlyArray<ReadonlyArray<unknown>> | undefined) ?? [];
  return (columns[0] ?? []).map((_, i) => Object.fromEntries(fields.map((f, j) => [f.name, columns[j]?.[i]])));
};

const ask = (c: Connection, apl: string): Effect.Effect<ReadonlyArray<Row>, SourceFailed> =>
  Effect.tryPromise({
    try: (signal) =>
      c.fetch(`${c.base}/v1/query/_apl?format=tabular`, {
        method: "POST",
        headers: { authorization: `Bearer ${c.token}`, "content-type": "application/json", ...(c.org ? { "x-axiom-org-id": c.org } : {}) },
        body: JSON.stringify({ apl }),
        signal,
      }).then((r) => r.text().then((body) => ({ status: r.status, body }))),
    catch: () => new SourceFailed({ message: "Axiom's query edge didn't answer" }),
  }).pipe(
    Effect.flatMap(({ status, body }) =>
      status >= 300
        ? Effect.fail(new SourceFailed({ message: `Axiom answered ${status} to the query: ${body.slice(0, 200)}` }))
        : Effect.try({ try: () => rowsOf(JSON.parse(body)), catch: () => new SourceFailed({ message: "Axiom's answer wasn't the tabular shape" }) })),
  );

const SPANS = "extend ms = toreal(duration / 1ms) | project name, ms, ['status.code'], _time, ['attributes.custom'], trace_id, span_id, parent_span_id";

/** Group rows into traces, then attach the logs of the traces whose calls were refused (the only logs an eval reads). */
const assemble = (c: Connection, group: string, spans: ReadonlyArray<Row>): Effect.Effect<ReadonlyMap<string, Trace>, SourceFailed> =>
  Effect.gen(function* () {
    const byTrace = new Map<string, { spans: Array<Span>; logs: Array<Log> }>();
    for (const row of spans) {
      const s = spanOf(row);
      (byTrace.get(s.traceId) ?? byTrace.set(s.traceId, { spans: [], logs: [] }).get(s.traceId)!).spans.push(s);
    }
    const refused = [...byTrace].filter(([id, t]) => HEX.test(id) && t.spans.some((s) => typeof s.attrs["refusal"] === "string")).map(([id]) => id);
    for (let i = 0; i < refused.length; i += CHUNK) {
      const ids = refused.slice(i, i + CHUNK).map((id) => `'${id}'`).join(", ");
      const logs = yield* ask(c, `['${group}-logs'] | where trace_id in (${ids}) | project body, trace_id, span_id | take ${LOG_LIMIT}`);
      for (const row of logs) byTrace.get(text(row["trace_id"]))?.logs.push(logOf(row));
    }
    return byTrace as ReadonlyMap<string, Trace>;
  });

const sourceOf = (c: Connection, group: string, environment: string): TraceSource => {
  const byIds = (ids: ReadonlyArray<string>) =>
    ask(c, `['${group}-traces'] | where trace_id in (${ids.map((id) => `'${id}'`).join(", ")}) | ${SPANS} | take ${SPAN_LIMIT}`).pipe(Effect.flatMap((rows) => assemble(c, group, rows)));
  return {
    window: (since) =>
      ask(c, [
        `['${group}-traces']`,
        `where _time > ago(${Math.max(1, Math.ceil(since / 1000))}s) and _time < ago(${LAG_SECONDS}s)`,
        `where ['resource.custom']['deployment.environment'] == '${environment}'`,
        SPANS,
        `take ${SPAN_LIMIT}`,
      ].join(" | ")).pipe(Effect.flatMap((rows) => assemble(c, group, rows))),
    find: (trace) => (HEX.test(trace) ? byIds([trace]).pipe(Effect.map((m) => m.get(trace)), Effect.orElseSucceed(() => undefined)) : Effect.succeed(undefined)),
    traces: (wanted: ReadonlyArray<Wanted>) =>
      Effect.gen(function* () {
        const ids = wanted.map((w) => w.trace).filter((id) => HEX.test(id));
        let last: ReadonlyMap<string, Trace> = new Map();
        // Axiom has no quiet period and its ingestion lags: an empty trace that may stay empty is believed only on a
        // second look, a second later, so the late spans of a handler that ran after all are still seen.
        let looks = 0;
        const settled = (ids.length === 0 ? Effect.succeed(new Map<string, Trace>()) : byIds(ids)).pipe(
          Effect.map((got) => {
            last = got;
            looks += 1;
            return wanted.every((w) => arrived(got.get(w.trace), looks > 1 ? w : { ...w, mayBeEmpty: false }));
          }),
          Effect.orElseSucceed(() => true),
        );
        yield* settled.pipe(Effect.repeat({ schedule: Schedule.spaced("1 second"), until: (done) => done }), Effect.timeoutOption("10 seconds"));
        return new Map(wanted.map((w): [string, Trace] => [w.trace, last.get(w.trace) ?? { spans: [], logs: [] }]));
      }),
  };
};

const baseOf = (domain: string): string => (domain.includes("://") ? domain.replace(/\/+$/, "") : `https://${domain}`);

const read = (env: Env, override: string, service: string, reader: Reader) =>
  Effect.gen(function* () {
    const given = env[override];
    return given ? given : yield* reader(service);
  });

export const AxiomSource: AxiomSourceApi = {
  open: ({ group, environment, env, read: reader = Sinks.keychain, fetch: fetcher = fetch }) =>
    Effect.gen(function* () {
      if (!NAME.test(group)) return yield* new SourceFailed({ message: `"${group}" isn't a dataset group name` });
      if (!NAME.test(environment)) return yield* new SourceFailed({ message: `"${environment}" isn't an environment name` });
      const token = yield* read(env, "AXIOM_QUERY_TOKEN", "capxul-query", reader);
      if (!token) return yield* new SourceFailed({ message: "no query token for Axiom: AXIOM_QUERY_TOKEN, or the keychain item capxul-query" });
      const domain = yield* read(env, "AXIOM_DOMAIN", "axiom-domain", reader);
      if (!domain) return yield* new SourceFailed({ message: "no edge domain for Axiom: AXIOM_DOMAIN, or the keychain item axiom-domain" });
      const org = yield* read(env, "AXIOM_ORG_ID", "axiom-org-id", reader);
      return sourceOf({ base: baseOf(domain), token, org, fetch: fetcher }, group, environment);
    }),
};
