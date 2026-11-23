// Calls: a handler's step that calls out through a mounted adapter (M1-plugins section 9). The foreign callable is
// wired by the generated server, never imported by the handler; the handler's one blank is how a failure becomes a
// declared error.
import type { Effect, Layer } from "effect";
import type { AdapterCall, BlueprintError } from "orthograph";

/** An adapter's callable: its default export in `src/calls/<call>.js`. A Promise function, or one that gives an Effect. */
export type Callable = (...args: ReadonlyArray<any>) => unknown;

/** What the callable answers: the value its Promise settles to, or its Effect succeeds with. */
export type AnswerOf<F extends Callable> = ReturnType<F> extends Effect.Effect<infer A, any, any> ? A : Awaited<ReturnType<F>>;

/** What the callable fails with: `unknown` for a Promise (a rejection or a throw), the typed failure of an Effect. */
export type FailureOf<F extends Callable> = ReturnType<F> extends Effect.Effect<any, infer E, any> ? E : unknown;

/** What the generated server hands a call step: the callable, and its adapter's layer when the adapter ships one. */
export interface CallWiring {
  readonly run: Callable;
  readonly layer?: Layer.Layer<any, any, any>;
}

/**
 * A call step, as a handler holds it: the callable's arguments, and the one mapping, from what the call failed with to
 * one of the errors the call declares. A refusal is only ever what the mapping made; anything else is a defect.
 */
export interface CallRunner<F extends Callable = Callable> {
  <E extends BlueprintError>(args: Parameters<F>, failure: (failure: FailureOf<F>) => E): Effect.Effect<AnswerOf<F>, E>;
}

export interface CallsApi {
  /** One call step's runner, not yet in its span: the handler wrapper puts it in `<thing>.<verb>.<step>`. */
  readonly runner: (spec: { readonly label: string; readonly step: { readonly call: AdapterCall }; readonly wiring: CallWiring | undefined }) => CallRunner;
}
