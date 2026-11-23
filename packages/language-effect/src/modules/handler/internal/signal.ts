// K5 seam 10: a step signal. An OTLP log record written as each step starts and as it ends, inside the step's own span, so
// its span id is the step's and the portal joins a start to its end and to the span by id. A span is exported only once it
// has ended, so without these a step still running is invisible; the logger exports on its interval while the request is
// still held, so the signal is in the Collector's file before the response, not at dispose.
import { Cause, Effect, Exit } from "effect";

/** What a step ended as: a refusal is an outcome the operation was built to give (`ok`, as its span ends), a defect is `error`. */
const outcomeOf = (exit: Exit.Exit<unknown, unknown>) =>
  Exit.isSuccess(exit) ? "ok" : Cause.hasInterrupts(exit.cause) ? "interrupted" : Cause.hasDies(exit.cause) ? "error" : "ok";

const signal = (step: string, phase: "start" | "end", outcome?: string) =>
  Effect.logInfo(`${step} ${phase}`).pipe(Effect.annotateLogs({ step, phase, ...(outcome === undefined ? {} : { outcome }) }));

/** `work` with its start and end signalled. Applied inside the step's span, so that the span is the one the signals carry. */
export const signalled = (step: string) => <A, E, R>(work: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
  Effect.andThen(signal(step, "start"), work.pipe(Effect.onExit((exit) => signal(step, "end", outcomeOf(exit)))));
