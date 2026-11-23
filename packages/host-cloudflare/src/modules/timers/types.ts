// The world's timer table and count of work in flight (M8.07), kept in the world's Durable Object. Every other process
// reaches them through the object's RPC (`WorldTimersRpc`); the controller walks the clock over them.
import type { Effect } from "effect";
import type { DurableTimer, Wake } from "@orthograph/language-effect";
import type { ClockSource, ClockState, Controller } from "#modules/clock/types.js";

/**
 * The wake route (M8.07): each kind of durable timer to the code that wakes what set it. The generated Worker declares the map
 * (empty today; Goals 8 and 10 and the keeper register a kind) and the world's Durable Object runs it, in the world's time,
 * when a durable row falls due. A kind nobody registered fails the wake, and its row stays pending.
 */
export type WorldWakes = Readonly<Record<string, (timer: DurableTimer) => Effect.Effect<void>>>;

/** One row, as the Worker sees it. */
export interface TimerRow {
  readonly id: number;
  readonly at: number;
  readonly owner: string;
  readonly name: string;
}

/**
 * What another process calls on the world's Durable Object. `timerWait` stays pending until the world fires the row; the
 * world counts the sleeper (`holder`) before it answers, with the source of the instant it fired at.
 */
export interface WorldTimersRpc {
  countEnter(owner: string): void;
  countLeave(owner: string): void;
  timerAdd(owner: string, name: string, at: number, holder: string): number;
  timerWait(id: number): Promise<ClockSource | undefined>;
  timerCancel(id: number): boolean;
  timerSet(at: number, owner: string, name: string, wake: Wake): number;
  timerClear(owner: string, name: string): boolean;
  timersSleeping(): ReadonlyArray<TimerRow>;
  timersDurable(): ReadonlyArray<DurableTimer>;
}

/** The world's side: the RPC surface, the controller the clock door settles with, and what a real world's alarm needs. */
export interface WorldTimersState {
  readonly rpc: WorldTimersRpc;
  readonly controller: Controller;
  /** The earliest instant a row is due, which a real world sets its alarm for; nothing for a world that is not real. */
  readonly nextAlarm: () => number | undefined;
  /** A real world's alarm: fire every row that has fallen due, as counted work. */
  readonly fireDue: () => Effect.Effect<void>;
  /** The owner of each token the world holds now, once per token, sorted. */
  readonly held: () => ReadonlyArray<string>;
  /** The warm reset between runs: no row survives, and a sleeper still waiting on a row is woken rather than left hanging. */
  readonly reset: () => void;
}

export interface WorldTimersOptions {
  readonly sql: SqlStorage;
  readonly clock: ClockState;
  /** `ORTHO_QUIET_MS`: how long a quiet wait may take in real time before the move fails as `NeverQuiet`. Five seconds when unset. */
  readonly env: { readonly ORTHO_QUIET_MS?: string };
  /** How a durable row reaches the code that set it; with none, firing one fails the step, naming it (M8.10 and Goals 8 and 10 route kinds). */
  readonly wakes?: (timer: DurableTimer) => Effect.Effect<void>;
  /** A row was set or taken: a real world moves its alarm. */
  readonly changed: () => void;
}
