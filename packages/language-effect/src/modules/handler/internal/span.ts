// O1's conventions for how a span ends. A declared refusal is an outcome the operation was built to give, so its span
// ends ok (it must not turn a trace red, count in an error list or open an issue); a defect, a failure nothing
// declared, is the only error. Effect ends a span with the exit of its work, so a refusal would end it as an error.
import { Cause, Effect, Result } from "effect";
import { defectTag } from "./defect.ts";

/**
 * `work` in a span named `name` that ends ok when the work fails with a typed failure (a refusal), and as an error
 * when it dies. The failure itself still leaves the span, unchanged, for the caller to handle.
 */
export const spanned = (name: string, attributes: Record<string, unknown>) => <A, E, R>(work: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
  work.pipe(
    // A span a defect passes through carries its tag (M1.49): the attempt's own failure is told from a step that died and was recovered by the same tag.
    Effect.tapCause((cause) => (Cause.hasDies(cause) ? Effect.annotateCurrentSpan(defectTag(cause)) : Effect.void)),
    Effect.result,
    Effect.withSpan(name, { attributes }),
    Effect.flatMap((outcome) => (Result.isFailure(outcome) ? Effect.fail(outcome.failure) : Effect.succeed(outcome.success))),
  );

/** A step also signals its start and end (K5 seam 10): see `signal.ts`. */
export { signalled } from "./signal.ts";
