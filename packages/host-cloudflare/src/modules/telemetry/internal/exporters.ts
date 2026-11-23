// Where a request's traces, logs and metrics go, whether to prove's Collector or a sink named in the environment.
// One fetch fans each export out to all of them, so Effect's exporters
// stay unaware there is more than one destination.
import { Option, Schema } from "effect";
import type { Exporter } from "../types.ts";

const Endpoint = Schema.Struct({ url: Schema.String, headers: Schema.Record(Schema.String, Schema.String) });
const Exporters = Schema.Array(Schema.Struct({ id: Schema.String, traces: Endpoint, logs: Endpoint, metrics: Schema.optionalKey(Endpoint) }));

const decode = Schema.decodeUnknownOption(Schema.fromJsonString(Exporters));

/** `OTLP_SINKS`: the sinks as JSON, set by whoever starts the environment. Anything malformed is no sink at all. */
export const sinksOf = (json: string | undefined): ReadonlyArray<Exporter> =>
  json === undefined || json === "" ? [] : Option.getOrElse(decode(json), () => []);

/** The Collector at `url`: no credentials, the standard OTLP paths. */
export const collectorOf = (url: string): Exporter => ({
  id: "local",
  traces: { url: `${url}/v1/traces`, headers: {} },
  logs: { url: `${url}/v1/logs`, headers: {} },
  metrics: { url: `${url}/v1/metrics`, headers: {} },
});

/** What the tracer and logger believe they are sending to. Only its path matters: it picks each exporter's own endpoint. */
export const BASE = "http://otlp.invalid";

/**
 * Personal details never leave the machine: `user.*`, `organization.id` and anything ending `.email` (the Claude Agent
 * SDK writes `user.email`, `user.account_uuid`, `user.account_id` and `organization.id` on its records). The local
 * Collector keeps what it was sent; every other exporter is sent the records without them.
 */
export const PERSONAL = /^(user\..*|organization\.id|email|.*\.email)$/;

const clean = (node: unknown): unknown =>
  Array.isArray(node) ? node.map(clean)
  : node !== null && typeof node === "object"
    ? Object.fromEntries(Object.entries(node).map(([k, v]) => [k, k === "attributes" && Array.isArray(v) ? v.filter((a) => !(typeof a?.key === "string" && PERSONAL.test(a.key))).map(clean) : clean(v)]))
    : node;

/** An OTLP/JSON export without any personal attribute, on resources, spans, events and log records. Not JSON: as it was. */
export const scrub = <B extends BodyInit | null | undefined>(body: B): B | string => {
  const text = typeof body === "string" ? body : body instanceof Uint8Array ? new TextDecoder().decode(body) : undefined;
  if (text === undefined) return body;
  try {
    return JSON.stringify(clean(JSON.parse(text)));
  } catch {
    return body;
  }
};

const pathOf = (url: string) => new URL(url).pathname;

/**
 * A `fetch` that sends each export to every exporter's endpoint for that signal. Prefer a successful response so
 * the exporter does not retry a delta another destination accepted. Wait for all sends so a flush under
 * `waitUntil` has finished every send.
 */
export const fanOut = (exporters: ReadonlyArray<Exporter>, base: typeof fetch): typeof fetch =>
  (input, init) => {
    const path = pathOf(String(input instanceof Request ? input.url : input));
    const signal = path === "/v1/metrics" ? "metrics" : path === "/v1/logs" ? "logs" : "traces";
    const sends = exporters.flatMap((e) => {
      const endpoint = e[signal];
      if (!endpoint) return [];
      const headers = new Headers(init?.headers as HeadersInit | undefined);
      for (const [k, v] of Object.entries(endpoint.headers)) headers.set(k, v);
      return [base(endpoint.url, { ...init, headers, ...(e.id === "local" || init?.body == null ? {} : { body: scrub(init.body) as BodyInit }) })];
    });
    return Promise.allSettled(sends).then((results) => {
      const answered = results.find((r): r is PromiseFulfilledResult<Response> => r.status === "fulfilled" && r.value.ok)
        ?? results.find((r): r is PromiseFulfilledResult<Response> => r.status === "fulfilled");
      if (answered) return answered.value;
      throw (results[0] as PromiseRejectedResult | undefined)?.reason ?? new Error("no exporter");
    });
  };
