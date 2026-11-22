// The Promise edge: agent-native's `run` and the approver return Promises, so this is where Effects are run and settled.
// No async, await, try or throw: Effect's own runners, and `Promise.reject` for the typed rejection.
import { Cause, Effect, Exit, Option } from "effect";
import { CANCELLED, classify, plain } from "./refusal.ts";

const rejectionOf = (cause: Cause.Cause<unknown>): Error => {
  const failure = Cause.findErrorOption(cause);
  if (Option.isSome(failure)) return classify(failure.value);
  return Cause.hasInterrupts(cause) ? plain(CANCELLED) : plain();
};

/** Runs the Effect; a failure rejects as an `ActionRefusal` or a redacted plain error, an aborted signal interrupts it. */
export const settle = <A, E>(effect: Effect.Effect<A, E>, ctx?: { readonly signal?: AbortSignal }): Promise<A> =>
  Effect.runPromiseExit(effect, ctx?.signal === undefined ? undefined : { signal: ctx.signal }).then((exit) =>
    Exit.isSuccess(exit) ? exit.value : Promise.reject(rejectionOf(exit.cause)),
  );

/** A Promise-returning call as an Effect that fails with its rejection, unchanged. */
export const fromPromise = <A>(call: () => Promise<A>): Effect.Effect<A, unknown> => Effect.tryPromise({ try: call, catch: (cause) => cause });
