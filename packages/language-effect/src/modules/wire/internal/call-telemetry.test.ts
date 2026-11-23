import { Context, Effect, Layer, Metric, Schema } from "effect";
import { HttpRouter, HttpServer } from "effect/http";
import { HttpApi, HttpApiBuilder, HttpApiEndpoint, HttpApiGroup } from "effect/http-api";
import { expect, it } from "vitest";
import { Principals } from "#modules/principals/types.js";
import { CallTelemetry } from "./call-telemetry.ts";

const Api = HttpApi.make("test").add(HttpApiGroup.make("allowance").add(
  HttpApiEndpoint.post("spend", "/spend", { payload: Schema.Struct({ amount: Schema.Number }), success: Schema.String }),
)).middleware(CallTelemetry);
const group = HttpApiBuilder.group(Api, "allowance", Effect.fn(function* (handlers) {
  const lookup = yield* Principals;
  return handlers.handle("spend", ({ request }) => lookup.of(request.headers["authorization"]).pipe(Effect.as("ok")));
}));
const principals = Layer.succeed(Principals, {
  of: (authorization) => authorization === undefined
    ? Effect.succeed({ kind: "anonymous" })
    : Effect.die(new Error("the principal lookup failed")),
});
const layer = HttpApiBuilder.layer(Api).pipe(
  Layer.provide(group), Layer.provideMerge(CallTelemetry.layer), Layer.provide(principals), Layer.provide(HttpServer.layerServices),
);

it("counts body read refusals and principal lookup defects before the serving wrapper", () =>
  Effect.runPromise(Effect.scoped(Effect.gen(function* () {
    const web = yield* Effect.acquireRelease(Effect.sync(() => HttpRouter.toWebHandler(layer)), (app) => Effect.promise(app.dispose));
    const context = Context.make(Metric.MetricRegistry, new Map());
    const url = "http://example.local/spend";
    const streamInit: RequestInit & { duplex: "half" } = {
      method: "POST", duplex: "half", headers: { "content-type": "application/json" },
      body: new ReadableStream({ start: (controller) => controller.error(new Error("the request body could not be read")) }),
    };
    const badBody = yield* Effect.promise(() => web.handler(new Request(url, streamInit), context));
    expect(badBody.status).toBe(400);

    const failedLookup = yield* Effect.promise(() => web.handler(new Request(url, {
      method: "POST", headers: { "content-type": "application/json", authorization: "lookup-failure" }, body: JSON.stringify({ amount: 5 }),
    }), context));
    expect(failedLookup.status).toBe(500);

    const metrics = yield* Metric.snapshot.pipe(Effect.provideContext(context));
    const counted = metrics.flatMap((metric) => metric.type === "Counter" && metric.id === "ortho.calls"
      ? [{ ...metric.attributes, count: Number(metric.state.count) }] : []);
    expect(counted).toHaveLength(2);
    expect(counted).toEqual(expect.arrayContaining([
      { operation: "allowance.spend", "principal.kind": "anonymous", outcome: "refused", refusal: "InvalidPayload", count: 1 },
      { operation: "allowance.spend", "principal.kind": "unknown", outcome: "defect", count: 1 },
    ]));
    const durations = metrics.flatMap((metric) => metric.type === "Histogram" && metric.id === "ortho.call.duration"
      ? [{ attributes: metric.attributes, count: metric.state.count }] : []);
    expect(durations).toEqual([{ attributes: { operation: "allowance.spend", unit: "ms" }, count: 2 }]);
  }))));
