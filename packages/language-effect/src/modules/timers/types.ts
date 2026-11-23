// Timers: the only way anything waits. Nothing reads the wall clock and nothing sleeps on its own; a world's clock
// (real, stepped or scaled) decides when each timer is due. Two services, one table (M8-timers-shape):
// `Timers` waits inside a fiber; `DurableTimers` sets a timer that outlives the fiber and the process, and the world
// hands it back through the host's `TimerWakes` when it falls due.
import { Context, type Duration, type Effect, type Option } from "effect";

export interface Timer {
  readonly id: number;
  /** Epoch milliseconds on the world's clock. */
  readonly at: number;
  /** Who set it, as a path: `agents/run/<runId>`, `workflows/<workflow>/<execution>`, `keeper/<thing>.<move>/<id>`. */
  readonly owner: string;
  readonly name: string;
}

export class Timers extends Context.Service<Timers, {
  /** Fire `work` at the instant `at`, as counted work. In-process only: `work` is a closure. */
  readonly at: <E>(at: number, owner: string, name: string, work: Effect.Effect<void, E>) => Effect.Effect<number>;
  /** A durable sleep: park until the world fires it. Must be called from counted work. */
  readonly sleep: (owner: string, span: Duration.Input) => Effect.Effect<void>;
  /** Park counted work while awaiting an interruptible port call. None means its timer won. Every world's Timers has it. */
  readonly within?: <A, E, R>(owner: string, span: Duration.Input, wait: Effect.Effect<A, E, R>) => Effect.Effect<Option.Option<A>, E, R>;
  /** The world's driver only: the earliest instant a timer is due at or before `target`, if any. */
  readonly due: (target: number) => Effect.Effect<number | undefined>;
  /** The world's driver only: fire every timer due at exactly `at`, in order (set first, then owner); returns what fired. */
  readonly fire: (at: number) => Effect.Effect<ReadonlyArray<Timer>>;
  readonly pending: Effect.Effect<ReadonlyArray<Timer>>;
}>()("@orthograph/language-effect/Timers") {}

/** JSON, as the world's table stores it. */
export type Json = null | boolean | number | string | ReadonlyArray<Json> | { readonly [key: string]: Json };

/** What a durable timer hands back when it fires: a kind the host routes on, and JSON for the woken code. */
export interface Wake {
  /** One handler per kind in the host: `"workflow"`, `"agent"`, `"keeper"`. */
  readonly kind: string;
  /** For a workflow, the DurableDeferred's token; for an agent run, the run's id. */
  readonly payload: Json;
}

export interface DurableTimer extends Timer {
  readonly wake: Wake;
}

export class DurableTimers extends Context.Service<DurableTimers, {
  /**
   * Set a timer that outlives this fiber and this process: a row in the world's table. Once per `(owner, name)`: while
   * one is pending, setting it again returns the first id and keeps its instant and wake (a replayed activity sets
   * nothing new). To move one, `clear` it and set it again. In a real world the row is kept behind an alarm.
   */
  readonly set: (at: number, owner: string, name: string, wake: Wake) => Effect.Effect<number>;
  /** Clear it if it has not fired; false when none was pending. Leaving a state clears the keeper's timer this way. */
  readonly clear: (owner: string, name: string) => Effect.Effect<boolean>;
  readonly pending: Effect.Effect<ReadonlyArray<DurableTimer>>;
}>()("@orthograph/language-effect/DurableTimers") {}

/**
 * The host's side: how a fired durable timer reaches the code that set it, in whatever process now runs it (an evicted
 * Durable Object is woken by its binding). The world calls `wake` at least once per firing, as counted work, and `wake`
 * returns only after the work it woke holds its own token, so the world is never quiet between the two. A handler is
 * idempotent by `(owner, name, at)`: a second firing changes nothing.
 */
export class TimerWakes extends Context.Service<TimerWakes, {
  readonly wake: (timer: DurableTimer) => Effect.Effect<void>;
}>()("@orthograph/language-effect/TimerWakes") {}
