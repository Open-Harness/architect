// What a handler's `steps` holds: one runner per declared step, each its own span marked with its kind. A `database` step's work is the store's, a
// `wait` step's a timer's, a `call` step's the adapter's, and an `operation` step's another operation of the app, run inside this attempt (#1079).
import { Effect } from "effect";
import type { CallStep, Operation, OperationStep } from "orthograph";
import { Calls } from "#modules/calls/service.js";
import type { CallRunner, CallWiring } from "#modules/calls/types.js";
import { innerOf, type Attempt } from "./attempt.ts";
import { signalled, spanned } from "./span.ts";

/** A call step: the adapter's call in a span named after the step, marked `call`. */
const callStep = (span: string, run: CallRunner) => (args: ReadonlyArray<unknown>, failure: (failure: never) => never) =>
  spanned(span, { "step.kind": "call" })(signalled(span)(run(args as never, failure as never)));

export interface Wiring {
  readonly calls: Readonly<Record<string, CallWiring>> | undefined;
  /** Each operation step's inner operation, served, by the step's key: wired by the generated server. */
  readonly operations: Readonly<Record<string, unknown>> | undefined;
}

/**
 * An operation step: the inner operation's whole pipeline, in this attempt, in a span named after the step and marked `operation`. Only the
 * operation the step declares runs: one wired under its key that is another is the server's bug, and dies naming both.
 */
const operationStep = (span: string, step: OperationStep, served: unknown) => (attempt: Attempt) => (payload: object) =>
  Effect.suspend(() => {
    const inner = innerOf(served);
    if (inner === undefined) return Effect.die(new Error(`${span} runs an operation, and the server wired none under its key`));
    if (inner.operation !== step.operation) return Effect.die(new Error(`${span} runs another operation than the server wired under its key (${inner.name})`));
    return inner.run(payload, attempt);
  }).pipe(signalled(span), spanned(span, { "step.kind": "operation" }));

/** The runners of `op`'s steps, made once; `bind` gives the ones a handler is handed in one attempt. */
export const stepsOf = (name: string, op: Operation, wiring: Wiring) => {
  const made = Object.entries(op.steps).map(([key, step]) => {
    const span = `${name}.${key}`;
    // An operation step's runner runs in the attempt it is bound to; a call step's and a plain step's are the same in every attempt.
    if (step.type === "operation") return [key, operationStep(span, step as OperationStep, wiring.operations?.[key])] as const;
    if (step.type === "call") {
      const call = callStep(span, Calls.runner({ label: span, step: step as CallStep, wiring: wiring.calls?.[key] }));
      return [key, () => call] as const;
    }
    const plain = <A, E, R>(work: Effect.Effect<A, E, R>) => spanned(span, { "step.kind": step.type })(signalled(span)(work));
    return [key, () => plain] as const;
  });
  return {
    /** Every refusal an inner operation of this one can make, from the operations the server wired under its operation steps. */
    innerRefusals: Object.entries(op.steps).flatMap(([key, step]) => (step.type === "operation" ? [...(innerOf(wiring.operations?.[key])?.refusals ?? [])] : [])),
    bind: (attempt: Attempt): object => Object.fromEntries(made.map(([key, make]) => [key, make(attempt)])),
  };
};
