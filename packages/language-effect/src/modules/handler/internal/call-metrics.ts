import { Cause, Clock, Context, Effect, Exit, Metric, Option } from "effect";
import type { Principal } from "orthograph";

const calls = Metric.counter("ortho.calls", { incremental: true });
const duration = Metric.histogram("ortho.call.duration", {
  attributes: { unit: "ms" },
  boundaries: [1, 5, 10, 25, 50, 75, 100, 125, 150, 200, 300, 500, 1000, 2000, 5000],
});

type Outcome = { readonly outcome: "answered" | "defect" } | { readonly outcome: "refused"; readonly refusal: string };

/** The HTTP decoder and the wrapper share this marker during one routed request. */
export const RoutedCall = Context.Reference<{ readonly operation: string; started: boolean } | undefined>(
  "@orthograph/language-effect/RoutedCall", { defaultValue: () => undefined },
);

/** One per call that took longer than its operation's declared `budget.p95`: a target for review, never a failure. */
const breaches = Metric.counter("ortho.budget.breaches", { incremental: true });

export const recordCall = (operation: string, kind: Principal["kind"] | "unknown", start: bigint, outcome: Outcome, budgetMs?: number) =>
  Effect.gen(function* () {
    const end = yield* Clock.monotonicTimeNanos;
    const took = Number(end - start) / 1e6;
    yield* Metric.update(Metric.withAttributes(calls, { operation, "principal.kind": kind, ...outcome }), 1);
    yield* Metric.update(Metric.withAttributes(duration, { operation }), took);
    if (budgetMs !== undefined && took > budgetMs) yield* Metric.update(Metric.withAttributes(breaches, { operation }), 1);
  });

const outcomeOf = (exit: Exit.Exit<unknown, unknown>, refusals: ReadonlySet<string>): Outcome => {
  if (Exit.isSuccess(exit)) return { outcome: "answered" };
  if (Cause.hasDies(exit.cause)) return { outcome: "defect" };
  const failure = Option.getOrUndefined(Cause.findErrorOption(exit.cause));
  const tag = typeof failure === "object" && failure !== null && "_tag" in failure ? failure._tag : undefined;
  return typeof tag === "string" && refusals.has(tag) ? { outcome: "refused", refusal: tag } : { outcome: "defect" };
};

/** Wrap the whole call, including decoding when this wrapper owns it and all internal attempts. */
export const measureCall = (operation: string, principal: Principal, refusals: ReadonlySet<string>, budgetMs?: number) => <A, E, R>(work: Effect.Effect<A, E, R>) =>
  Effect.gen(function* () {
    const routed = yield* RoutedCall;
    if (routed?.operation === operation) routed.started = true;
    const start = yield* Clock.monotonicTimeNanos;
    return yield* work.pipe(Effect.onExit((exit) => recordCall(operation, principal.kind, start, outcomeOf(exit, refusals), budgetMs)));
  });
