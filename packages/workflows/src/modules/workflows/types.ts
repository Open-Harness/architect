// What `@orthograph/workflows` offers (M3-workflows sections 2, 3 and 6). Written by the author of the checks (M3.27);
// the builder (M3.28) owns it from here.
import { Context, Data, type Effect, type Layer } from "effect";
import type { Workflow, WorkflowHandler } from "orthograph";

/** A workflow refused at registration, naming the activity (section 2): a `call` on an operation without `idempotent: "request"`. */
export class WorkflowRefused extends Data.TaggedError("WorkflowRefused")<{
  readonly workflow: string;
  /** The activity's key in the declaration: `freeze`, not a path. */
  readonly activity: string;
  readonly message: string;
}> {}

/** A declaration and its handler: what `Workflows.layer({ publish })` takes for each name. */
export interface Registration {
  readonly workflow: Workflow;
  readonly handler: WorkflowHandler<any>;
}

/** What registering accepted: each workflow turned into the engine's own. Opaque to callers. */
export interface Registered {
  readonly names: ReadonlyArray<string>;
}

/** A journal entry as an event delivery carries it: the event's name, its fields, and its request key. */
export interface WorkflowEntry {
  readonly event: string;
  readonly fields: { readonly [field: string]: unknown };
  readonly key: string;
}

/** The one seam that completes waits (section 3). Called at least once per entry; never needs a lock. */
export class WorkflowEvents extends Context.Service<WorkflowEvents, {
  /** Complete the wait of every run whose `match` agrees with the entry; how many it woke. */
  readonly deliver: (entry: WorkflowEntry) => Effect.Effect<{ readonly woken: number }>;
}>()("@orthograph/workflows/WorkflowEvents") {}

export interface WorkflowsApi {
  /**
   * Check every registration and turn it into the engine's workflow. Refuses, with `WorkflowRefused` naming the activity,
   * a `call` whose operation is not `idempotent: "request"`. Nothing is started and no engine is needed, so the refusal
   * is judged on its own.
   */
  readonly register: (registrations: { readonly [name: string]: Registration }) => Effect.Effect<Registered, WorkflowRefused>;
  /** `register`, then the layer a host runs workflows from: `Workflows.layer({ publish })`. */
  readonly layer: (registrations: { readonly [name: string]: Registration }) => Layer.Layer<WorkflowEvents, WorkflowRefused>;
}
