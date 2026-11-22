// The application runtime, built once per isolate: the engine on the workflow namespace, the workflow's handler with the
// world's clock and the Outside service. Throwaway.
import { CloudflareWorkflowEngine } from "@effect/platform-cloudflare";
import { Clock, Effect, Layer, ManagedRuntime } from "effect";
import type { WorkflowEngine } from "effect/workflow/WorkflowEngine";
import { worldClock } from "./world-clock.ts";
import { Outside, PublishLayer } from "./workflow.ts";
import type { Ledger } from "./ledger.ts";
import type { World } from "./world.ts";

export interface Env {
  readonly CLUSTER_WORKFLOW: DurableObjectNamespace;
  readonly WORLD: DurableObjectNamespace<World>;
  readonly LEDGER: DurableObjectNamespace<Ledger>;
}

/** The workflow objects alive in this isolate, so an activity can abort its own object (the crash case). */
export const live = new Map<string, DurableObjectState>();

const outside = (env: Env) => Outside.of({
  apply: (key, run, activity, detail) => Effect.promise(() => env.LEDGER.getByName("ledger").apply(key, run, activity, detail)),
  at: (at, owner, name, token) => Effect.promise(() => env.WORLD.getByName("world").at(at, owner, name, token)),
  crash: (executionId) => Effect.sync(() => {
    const ctx = live.get(executionId);
    if (ctx === undefined) throw new Error(`no live object for ${executionId}`);
    ctx.abort("spike: evicted inside an activity");
  }),
});

const layer = (env: Env) =>
  PublishLayer.pipe(
    Layer.provide(Layer.succeed(Outside, outside(env))),
    // The workflow's own code reads the world's time. The engine and its Durable Object keep the platform clock.
    Layer.provide(Layer.succeed(Clock.Clock, worldClock)),
    Layer.provideMerge(CloudflareWorkflowEngine.layer({ workflowNamespace: env.CLUSTER_WORKFLOW })),
  );

let runtime: Promise<ManagedRuntime.ManagedRuntime<WorkflowEngine, never>> | undefined;

export const app = (env: Env) =>
  (runtime ??= (async () => {
    const rt = ManagedRuntime.make(layer(env));
    await rt.runPromise(Effect.void);
    return rt;
  })());
