import { Effect, Metric, type Context } from "effect";
import { afterEach, describe, expect, it } from "vitest";
import { Telemetry } from "./service.ts";
import { collectorOf, fanOut, scrub, sinksOf } from "./internal/exporters.ts";

const echo = (request: Request) => Promise.resolve(new Response(request.headers.get("traceparent")));
const serve = (request: Request) => Telemetry.serve({ url: undefined, service: "test", handler: echo, waitUntil: () => undefined }, request);

describe("telemetry, in workerd", () => {
  it("keeps a caller's trace and answers with its id", async () => {
    const parent = "00-0123456789abcdef0123456789abcdef-0123456789abcdef-01";
    const response = await serve(new Request("http://w/", { headers: { traceparent: parent } }));
    expect(response.headers.get("x-trace-id")).toBe("0123456789abcdef0123456789abcdef");
    expect(await response.text()).toBe(parent);
  });

  it("with no collector and no sink, the call's own spans still carry the caller's trace", async () => {
    const parent = "00-0123456789abcdef0123456789abcdef-0123456789abcdef-01";
    const handler = (_request: Request, context?: Context.Context<never>) =>
      Effect.runPromise(Effect.provideContext(Effect.withSpan(Effect.currentSpan, "op.step"), context ?? (Effect.runSync(Effect.context<never>()) as Context.Context<never>))).then(
        (span) => new Response(span.traceId),
        () => new Response("no span"),
      );
    const response = await Telemetry.serve({ url: undefined, service: "test", handler, waitUntil: () => undefined }, new Request("http://w/", { headers: { traceparent: parent } }));
    expect(await response.text()).toBe("0123456789abcdef0123456789abcdef");
  });

  it("mints a trace when the caller has none, and the handler sees it", async () => {
    const response = await serve(new Request("http://w/"));
    const trace = response.headers.get("x-trace-id")!;
    expect(trace).toMatch(/^[0-9a-f]{32}$/);
    expect(await response.text()).toContain(trace);
  });
});

const legacySink = {
  id: "legacy",
  traces: { url: "https://legacy.example/v1/traces", headers: {} },
  logs: { url: "https://legacy.example/v1/logs", headers: {} },
};
const sinks = JSON.stringify([legacySink, {
  id: "axiom",
  traces: { url: "https://sink.example/v1/traces", headers: { authorization: "Bearer not-a-real-token", "x-axiom-dataset": "demo-traces" } },
  logs: { url: "https://sink.example/v1/logs", headers: { authorization: "Bearer not-a-real-token", "x-axiom-dataset": "demo-logs" } },
  metrics: { url: "https://sink.example/v1/metrics", headers: { authorization: "Bearer not-a-real-token", "x-axiom-metrics-dataset": "demo-metrics" } },
}]);

describe("sinks beside the collector", () => {
  const real = globalThis.fetch;
  afterEach(() => { globalThis.fetch = real; });

  it("sends each signal to every exporter's own endpoint, with its own headers, and tags every span with the environment", async () => {
    const sent: Array<{ url: string; headers: Headers; body: string }> = [];
    globalThis.fetch = ((url: string, init?: RequestInit) => {
      sent.push({ url, headers: new Headers(init?.headers), body: typeof init?.body === "string" ? init.body : new TextDecoder().decode(init?.body as Uint8Array) });
      return Promise.resolve(new Response("{}"));
    }) as typeof fetch;
    const pending: Array<Promise<unknown>> = [];
    const metric = Metric.counter("demo.calls", { incremental: true });
    const handler = (_: Request, context?: Context.Context<never>) => Effect.runPromise(
      Effect.withSpan(Effect.log("hello"), "demo.span").pipe(
        Effect.andThen(Metric.update(metric, 1)), Effect.provideContext(context!), Effect.as(new Response("ok")),
      ),
    );
    await Telemetry.serve({ url: "http://collector.test", sinks, environment: "local", service: "demo", handler, waitUntil: (p) => void pending.push(p) }, new Request("http://w/"));
    await Promise.all(pending);

    const to = (url: string) => sent.filter((s) => s.url === url);
    expect(to("http://collector.test/v1/traces").length).toBeGreaterThan(0);
    expect(to("http://collector.test/v1/traces")[0]!.headers.has("authorization")).toBe(false);
    const axiom = to("https://sink.example/v1/traces");
    expect(axiom.length).toBeGreaterThan(0);
    expect(axiom[0]!.headers.get("authorization")).toBe("Bearer not-a-real-token");
    expect(axiom[0]!.headers.get("x-axiom-dataset")).toBe("demo-traces");
    expect(to("https://sink.example/v1/logs")[0]!.headers.get("x-axiom-dataset")).toBe("demo-logs");
    expect(to("https://legacy.example/v1/traces").length).toBeGreaterThan(0);
    expect(to("https://legacy.example/v1/logs").length).toBeGreaterThan(0);
    expect(to("https://legacy.example/v1/metrics")).toEqual([]);
    const [localMetrics] = to("http://collector.test/v1/metrics");
    const [sinkMetrics] = to("https://sink.example/v1/metrics");
    expect(localMetrics?.headers.has("authorization")).toBe(false);
    expect(sinkMetrics?.headers.get("x-axiom-metrics-dataset")).toBe("demo-metrics");
    expect(sinkMetrics?.headers.get("authorization")).toBe("Bearer not-a-real-token");
    expect(localMetrics?.body).toContain("demo.calls");
    expect(sinkMetrics?.body).toContain("demo.calls");
    for (const s of [...to("http://collector.test/v1/traces"), ...axiom]) {
      expect(s.body).toContain("demo.span");
      expect(s.body).toContain('"deployment.environment"');
    }
  });

  it("lets one exporter fail without failing the others", async () => {
    const calls: Array<string> = [];
    const base = ((url: string) => (calls.push(url), url.includes("down") ? Promise.reject(new Error("refused")) : Promise.resolve(new Response("{}")))) as unknown as typeof fetch;
    const exporter = (id: string, host: string) => ({ id, traces: { url: `https://${host}/v1/traces`, headers: {} }, logs: { url: `https://${host}/v1/logs`, headers: {} } });
    const answer = await fanOut([exporter("a", "down.example"), exporter("b", "up.example")], base)("http://otlp.invalid/v1/traces", { method: "POST", body: "x" });
    expect(answer.ok).toBe(true);
    expect(calls).toEqual(["https://down.example/v1/traces", "https://up.example/v1/traces"]);
  });

  it("keeps the successful metrics response when the first destination returns a server error", () => {
    const axiom = sinksOf(sinks).find((sink) => sink.id === "axiom")!;
    const base = ((url: string) => Promise.resolve(new Response("{}", { status: url.includes("collector.test") ? 500 : 200 }))) as typeof fetch;
    const send = fanOut([collectorOf("http://collector.test"), axiom], base);
    return send("http://otlp.invalid/v1/metrics", { method: "POST", body: "{}" }).then((response) => {
      expect(response.status).toBe(200);
    });
  });

  it("leaves no personal detail on anything sent off the machine, and keeps them for the local collector", async () => {
    const personal = ["user.email", "user.account_uuid", "user.account_id", "organization.id", "user.anything", "payload.email"];
    const kv = (k: string) => ({ key: k, value: { stringValue: "someone@example.com" } });
    const body = JSON.stringify({
      resourceSpans: [{
        resource: { attributes: [kv("service.name"), kv("user.email")] },
        scopeSpans: [{ spans: [{ name: "s", attributes: [...personal.map(kv), kv("operation")], events: [{ name: "e", attributes: [kv("user.account_id"), kv("keep")] }] }] }],
      }],
    });
    const sent: Array<{ url: string; body: string }> = [];
    const base = ((url: string, init?: RequestInit) => (sent.push({ url, body: String(init?.body) }), Promise.resolve(new Response("{}")))) as unknown as typeof fetch;
    const exporter = (id: string, host: string) => ({ id, traces: { url: `https://${host}/v1/traces`, headers: {} }, logs: { url: `https://${host}/v1/logs`, headers: {} } });
    await fanOut([exporter("local", "local.test"), exporter("axiom x", "off.test")], base)("http://otlp.invalid/v1/traces", { method: "POST", body });
    const off = sent.find((s) => s.url.startsWith("https://off.test"))!.body;
    const local = sent.find((s) => s.url.startsWith("https://local.test"))!.body;
    for (const k of personal) {
      expect(off).not.toContain(`"${k}"`);
      expect(local).toContain(`"${k}"`);
    }
    expect(off).toContain('"operation"');
    expect(off).toContain('"keep"');
    expect(off).toContain('"service.name"');
    expect(scrub("not json")).toBe("not json");
  });

  it("treats malformed sinks as no sinks", () => {
    expect(sinksOf("not json")).toEqual([]);
    expect(sinksOf(undefined)).toEqual([]);
    expect(sinksOf(JSON.stringify([legacySink]))).toEqual([legacySink]);
    expect(sinksOf(sinks)).toHaveLength(2);
  });
});
