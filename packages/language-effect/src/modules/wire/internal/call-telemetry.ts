import { Cause, Clock, Effect, Exit, Layer } from "effect";
import { HttpMiddleware, HttpServerError, HttpServerRequest } from "effect/http";
import { HttpApiError, HttpApiMiddleware } from "effect/http-api";
import { recordCall, RoutedCall } from "#modules/handler/internal/call-metrics.js";
import { Principals } from "#modules/principals/types.js";

const badPayload = (error: unknown) =>
  (HttpApiError.HttpApiSchemaError.is(error) && error.kind === "Payload") ||
  HttpApiError.HttpApiPayloadTooLarge.is(error) ||
  (HttpServerError.isHttpServerError(error) && error.reason._tag === "RequestParseError");

export class CallTelemetry extends HttpApiMiddleware.Service<CallTelemetry>()("@orthograph/language-effect/CallTelemetry") {
  static readonly layer = Layer.merge(
    Layer.effect(CallTelemetry, Effect.map(Principals, (principals): CallTelemetry["Service"] => (work, { endpoint, group }) =>
      Effect.gen(function* () {
        const start = yield* Clock.monotonicTimeNanos;
        const request = yield* HttpServerRequest.HttpServerRequest;
        const route = { operation: `${group.identifier}.${endpoint.identifier}`, started: false };
        // The handler counts its own calls. At this boundary count calls that never reached the wrapper.
        const rejected = principals.of(request.headers["authorization"]).pipe(
          Effect.withTracerEnabled(false),
          Effect.map((principal) => principal.kind),
          Effect.catchCause(() => Effect.succeed("unknown" as const)),
          Effect.flatMap((kind) => recordCall(route.operation, kind, start, {
            outcome: "refused", refusal: "InvalidPayload",
          })),
        );
        return yield* work.pipe(
          Effect.provideService(RoutedCall, route),
          Effect.onExit((exit) => {
            if (route.started) return Effect.void;
            const refused = Exit.isSuccess(exit) ? exit.value.status === 413 || exit.value.status === 415 : badPayload(Cause.squash(exit.cause));
            return refused ? rejected : recordCall(route.operation, "unknown", start, { outcome: "defect" });
          }),
        );
      }),
    )),
    // The operation starts its span after access. An automatic HTTP span would trace a refused request anyway.
    Layer.succeed(HttpMiddleware.TracerDisabledWhen, () => true),
  );
}
