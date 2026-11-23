import { Context, Duration, Layer, ManagedRuntime, Metric, Tracer } from "effect";
import { FetchHttpClient } from "effect/http";
import { OtlpLogger, OtlpMetrics, OtlpSerialization, OtlpTracer } from "effect/observability";
import type { Exporter, TelemetryApi } from "./types.ts";
import { BASE, collectorOf, fanOut, sinksOf } from "./internal/exporters.ts";

const exporters = (targets: ReadonlyArray<Exporter>, serviceName: string, environment: string | undefined) => {
  // Every signal carries the environment on its resource.
  const attributes = environment === undefined ? {} : { "deployment.environment": environment, "deployment.environment.name": environment };
  const options = { resource: { serviceName, attributes }, exportInterval: "100 millis", maxBatchSize: 64, shutdownTimeout: "3 seconds" } as const;
  return Layer.mergeAll(
    OtlpTracer.layer({ url: `${BASE}/v1/traces`, ...options }),
    OtlpLogger.layer({ url: `${BASE}/v1/logs`, ...options }),
    // Flush metrics once at disposal so a periodic export cannot resend the same delta as the final flush.
    ...(targets.some((target) => target.metrics) ? [OtlpMetrics.layer({ url: `${BASE}/v1/metrics`, ...options, exportInterval: Duration.infinity, temporality: "delta" })] : []),
  ).pipe(
    // Export only this request's observations when its runtime closes.
    Layer.provideMerge(Layer.succeed(Metric.MetricRegistry, new Map())),
    Layer.provide(OtlpSerialization.layerJson),
    Layer.provide(FetchHttpClient.layer),
    Layer.provide(Layer.succeed(FetchHttpClient.Fetch, fanOut(targets, globalThis.fetch.bind(globalThis)))),
  );
};

const TRACEPARENT = /^00-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/;
const hex = (bytes: number) => Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (b) => b.toString(16).padStart(2, "0")).join("");

/** Set by `configure`: the environment's sinks and name, for this isolate. */
let configured: { sinks: string | undefined; environment: string | undefined } = { sinks: undefined, environment: undefined };

export const Telemetry: TelemetryApi = {
  configure: (options) => {
    configured = options;
  },
  serve: ({ url, sinks = configured.sinks, environment = configured.environment, service, handler, waitUntil }, request) => {
    const given = request.headers.get("traceparent")?.match(TRACEPARENT);
    const trace = given?.[1] ?? hex(16);
    const spanId = given?.[2] ?? hex(8);
    const flags = given?.[3] ?? "01";
    const headers = new Headers(request.headers);
    if (!given) headers.set("traceparent", `00-${trace}-${spanId}-${flags}`);
    const traced = new Request(request, { headers });
    const answered = (response: Response) => {
      const out = new Response(response.body, response);
      out.headers.set("x-trace-id", trace);
      return out;
    };
    // The caller's span is the parent of every span of the call, exported or not: with no target the call's spans still
    // carry the caller's trace, and so does every journal row they write (the staging story reads its facts by it).
    const parent = Tracer.externalSpan({ traceId: trace, spanId, sampled: (parseInt(flags, 16) & 1) === 1 });
    const targets = [...(url ? [collectorOf(url)] : []), ...sinksOf(sinks)];
    if (targets.length === 0) return handler(traced, Context.make(Tracer.ParentSpan, parent) as unknown as Context.Context<never>).then(answered);
    // One runtime per request: its exporters are flushed when it is disposed, after the response, under waitUntil.
    const runtime = ManagedRuntime.make(exporters(targets, service, environment));
    // Disposed whether the handler answers or throws, so a failed request still exports what it recorded.
    return runtime
      .context()
      .then((context) => handler(traced, Context.add(context, Tracer.ParentSpan, parent) as unknown as Context.Context<never>))
      .finally(() => waitUntil(runtime.dispose()))
      .then(answered);
  },
};
