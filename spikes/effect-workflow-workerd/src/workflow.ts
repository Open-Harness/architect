// The publish workflow from K5 seam 6, cut down: freeze, propose, wait for the confirmed event, link, wait 30 days on
// the world's clock, settle. Each activity calls the Ledger with the request key K5 names (run id plus activity name,
// `Activity.idempotencyKey`). Throwaway.
import { Clock, Context, Duration, Effect, Schema } from "effect";
import * as Activity from "effect/workflow/Activity";
import * as DurableClock from "effect/workflow/DurableClock";
import * as DurableDeferred from "effect/workflow/DurableDeferred";
import * as Workflow from "effect/workflow/Workflow";
import { WorkflowInstance } from "effect/workflow/WorkflowEngine";
import { timerDeferred } from "./world.ts";

export const COOLDOWN = Duration.toMillis(Duration.days(30));

/** What the workflow's activities touch outside the engine: the ledger, the world's timer table, and a way to die. */
export class Outside extends Context.Service<Outside, {
  readonly apply: (key: string, run: string, activity: string, detail: string) => Effect.Effect<{ call: number; applied: boolean }>;
  readonly at: (at: number, owner: string, name: string, token: string) => Effect.Effect<{ at: number; inserted: boolean }>;
  /** Abort the workflow's own Durable Object, as an eviction in the middle of an activity would. */
  readonly crash: (executionId: string) => Effect.Effect<void>;
}>()("spike/Outside") {}

export const Publish = Workflow.make("Publish", {
  payload: {
    run: Schema.String,
    /** "timers": wait through the world's timer table. "clock": the engine's own `DurableClock.sleep`. */
    sleep: Schema.Literals(["timers", "clock"]),
    /** Abort the Durable Object inside this activity, after its effect, on its first call. */
    crashIn: Schema.optional(Schema.String),
    /** Hold settle for this many real milliseconds before its effect, to show the advance does not wait for it. */
    settleDelayMs: Schema.optional(Schema.Number),
  },
  idempotencyKey: (p) => p.run,
  success: Schema.Struct({ proposal: Schema.String, settled: Schema.String }),
});

export const Confirmed = DurableDeferred.make("confirmed", { success: Schema.Struct({ proposal: Schema.String }) });
const Cooldown = timerDeferred("cooldown");

const iso = (t: number) => new Date(t).toISOString();

const step = (run: string, name: string, detail: Effect.Effect<string>, crashIn: string | undefined, delayMs = 0) =>
  Activity.make({
    name,
    success: Schema.String,
    execute: Effect.gen(function* () {
      const outside = yield* Outside;
      const key = yield* Activity.idempotencyKey(name);
      // A real-time hold, outside every clock: the spike's stand-in for slow work. Not Effect.sleep (the world clock dies).
      if (delayMs > 0) yield* Effect.promise(() => new Promise((r) => setTimeout(r, delayMs)));
      const value = yield* detail;
      const done = yield* outside.apply(key, run, name, value);
      if (crashIn === name && done.call === 1) {
        const instance = yield* WorkflowInstance;
        yield* outside.crash(instance.executionId);
      }
      return value;
    }),
  });

export const PublishLayer = Publish.toLayer(Effect.fnUntraced(function* (p, executionId) {
  yield* step(p.run, "freeze", Effect.succeed(`digest-of-${p.run}`), p.crashIn);
  yield* step(p.run, "propose", Effect.succeed("proposal opened"), p.crashIn);
  const confirmed = yield* DurableDeferred.await(Confirmed);
  yield* step(p.run, "link", Effect.succeed(confirmed.proposal), p.crashIn);
  if (p.sleep === "timers") {
    // Timers.at: the wait is a row in the world's table, set once (an activity, so a replay does not set it again).
    yield* Activity.make({
      name: "timer/cooldown",
      success: Schema.Number,
      execute: Effect.gen(function* () {
        const outside = yield* Outside;
        const token = yield* DurableDeferred.token(Cooldown);
        const now = yield* Clock.currentTimeMillis;
        return (yield* outside.at(now + COOLDOWN, executionId, "cooldown", token)).at;
      }),
    });
    yield* DurableDeferred.await(Cooldown);
  } else {
    yield* DurableClock.sleep({ name: "cooldown", duration: Duration.days(30) });
  }
  const settled = yield* step(p.run, "settle", Effect.map(Clock.currentTimeMillis, iso), p.crashIn, p.settleDelayMs);
  return { proposal: confirmed.proposal, settled };
}));
