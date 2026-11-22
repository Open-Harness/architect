// Workflows (M3-workflows, section 1): a job that runs for a long time in steps. Declared in `blueprint/workflows/<name>.ts`,
// written in `src/workflows/<name>.ts`. Three kinds of activity: `call` an operation, `await` an event, wait `after` a span
// or `at` an instant. Written by the author of the checks (M3.27) so they have something to import; the builder (M3.28)
// owns this module from here.
import type { Duration, Effect, Option, Schema } from "effect";
import type { Event } from "#modules/events/types.js";
import type { AnswerOf, Operation, PayloadOf } from "#modules/operations/types.js";
import type { FieldsInput, ValueOf } from "#modules/things/types.js";

/** Calls an operation as the run's `system` principal, carrying the request key. The operation must be `idempotent: "request"`. */
export interface CallActivity<O extends Operation = Operation> {
  readonly kind: "call";
  readonly operation: O;
}

/** Waits for an event whose fields match; with `within`, gives `None` if the span passes first. */
export interface AwaitActivity<E extends Event = Event> {
  readonly kind: "await";
  readonly event: E;
  readonly within: Duration.Input | undefined;
}

/** A durable timer: due `span` after the world's now (`after`), or at an instant (`at`). */
export interface TimerActivity {
  readonly kind: "after" | "at";
  readonly when: Duration.Input | string;
}

export type ActivityDeclaration = CallActivity | AwaitActivity | TimerActivity;
export type Activities = { readonly [key: string]: ActivityDeclaration };

export interface WorkflowSpec<S extends FieldsInput, A extends Activities> {
  readonly description: string;
  /** The run's key: starting twice with the same fields is one run. */
  readonly starts: S;
  readonly activities: A;
}

export interface Workflow<S extends FieldsInput = FieldsInput, A extends Activities = Activities> extends WorkflowSpec<S, A> {
  readonly kind: "workflow";
}

type StructOf<F extends FieldsInput> = Schema.Struct<{ readonly [K in keyof F]: ValueOf<F[K]>["schema"] }>;
type FieldsOf<E> = E extends Event<infer F> ? StructOf<F>["Type"] : never;

/** `.for(key)` names each pass of a loop, so every pass is its own recorded activity. */
type Keyed<Run, Pass> = Run & { readonly for: (key: string) => Pass };

export type ActivityRun<D> =
  D extends CallActivity<infer O>
    ? Keyed<(payload: PayloadOf<O>) => Effect.Effect<AnswerOf<O>>, (payload: PayloadOf<O>) => Effect.Effect<AnswerOf<O>>>
    : D extends AwaitActivity<infer E>
      ? Keyed<
          (wait: { readonly match: Partial<FieldsOf<E>> }) => Effect.Effect<Option.Option<FieldsOf<E>>>,
          (wait: { readonly match: Partial<FieldsOf<E>> }) => Effect.Effect<Option.Option<FieldsOf<E>>>
        >
      : D extends TimerActivity
        ? Effect.Effect<void> & { readonly for: (key: string) => Effect.Effect<void> }
        : never;

export type ActivitiesOf<W> = W extends Workflow<any, infer A> ? { readonly [K in keyof A]: ActivityRun<A[K]> } : never;
export type StartsOf<W> = W extends Workflow<infer S, any> ? StructOf<S>["Type"] : never;

/** `const publish: WorkflowHandler<typeof Publish> = ({ revision }, { activities }) => Effect.gen(...)`. Replayed: the same every time. */
export type WorkflowHandler<W extends Workflow, A = unknown, E = unknown, R = never> = (
  starts: StartsOf<W>,
  context: { readonly activities: ActivitiesOf<W> },
) => Effect.Effect<A, E, R>;

export interface WorkflowsApi {
  readonly workflow: <const S extends FieldsInput, const A extends Activities>(spec: WorkflowSpec<S, A>) => Workflow<S, A>;
  readonly activity: {
    readonly call: <O extends Operation>(operation: O) => CallActivity<O>;
    readonly await: <E extends Event>(event: E, options?: { readonly within?: Duration.Input }) => AwaitActivity<E>;
    readonly after: (span: Duration.Input) => TimerActivity;
    readonly at: (instant: string) => TimerActivity;
  };
}
