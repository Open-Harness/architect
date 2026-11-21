import { Effect } from "effect";
import type { Availability } from "#modules/wire/types.js";
import type { TelemetryApi, WindowFailure } from "./types.ts";
import { callsOf } from "./internal/calls.ts";
import { countsOf } from "./internal/counts.ts";
import { kindsOf, stepsOf } from "./internal/spans.ts";
import { traceOf } from "./internal/trace.ts";

/** A read that failed, or died, is a value naming its reason; it never carries what the source held. */
const attempt = <A>(read: Effect.Effect<A, WindowFailure>): Effect.Effect<Availability<A>> =>
  read.pipe(
    Effect.result,
    Effect.map((done): Availability<A> => done._tag === "Success" ? { state: "available", value: done.success } : { state: "unavailable", reason: typeof done.failure?.message === "string" ? done.failure.message : "the source could not be read" }),
    Effect.catchCause(() => Effect.succeed<Availability<A>>({ state: "unavailable", reason: "the source could not be read" })),
  );

const budgetsOf = (blueprint: Parameters<TelemetryApi["read"]>[0]) => Object.fromEntries(Object.entries(blueprint.model.operations).map(([name, op]) => [name, op.budget?.p95Ms]));

const read: TelemetryApi["read"] = (blueprint, live) =>
  Effect.gen(function* () {
    const budgets = budgetsOf(blueprint);
    const traces = yield* attempt(live.source.window(live.windowMs, live.now));
    const points = yield* attempt(live.metrics.window(live.windowMs, live.now));
    const calls = traces.state === "available" ? callsOf(traces.value, live.environment, budgets, kindsOf(blueprint), stepsOf(blueprint), { since: live.now - live.windowMs, now: live.now }) : undefined;
    return {
      environment: live.environment, now: live.now, windowMs: live.windowMs, since: live.now - live.windowMs,
      metrics: points.state === "available" ? { state: "available", value: countsOf(blueprint, points.value, calls?.refusals) } : points,
      calls: calls === undefined ? (traces as Extract<typeof traces, { state: "unavailable" }>) : { state: "available", value: calls.view },
    };
  });

const trace: TelemetryApi["trace"] = (live, id) =>
  attempt(live.source.find(id)).pipe(Effect.map((found) => found.state === "unavailable" ? found : { state: "available", value: found.value === undefined ? undefined : traceOf(id, found.value) }));

const calls: TelemetryApi["calls"] = (blueprint, traces, environment, window) => callsOf(traces, environment, budgetsOf(blueprint), kindsOf(blueprint), stepsOf(blueprint), window).all;

const identity: TelemetryApi["identity"] = (call) => call.id;

export const Telemetry: TelemetryApi = { read, calls, identity, trace };
