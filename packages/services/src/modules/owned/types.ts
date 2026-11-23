// A process Orthograph starts for a world, a test or a gate: owned by PID, stopped with its scope, never found by a name
// (K10 section 8, M1.33). The same markers `@orthograph/prove` leaves for its Collector, so one sweep finds them all.
import { Data, type Effect, type Scope } from "effect";

/** `exited`: the process ended before it answered (a port taken since it was picked, a bad config), not a slow start. */
export class ProcessFailed extends Data.TaggedError("ProcessFailed")<{ readonly message: string; readonly exited?: boolean }> {}

/** A claim, not proof: this PID was started with this command by this owner. A PID is only signalled while `ps` still agrees. */
export interface Marker {
  readonly kind: string;
  readonly pid: number;
  /** The process that must stop it; 0 when something else does. */
  readonly owner: number;
  readonly command: string;
  /** What `ps` shows once the program has renamed itself (Verdaccio does: `verdaccio`), when that is not the command it was started with. */
  readonly title?: string;
}

export interface StartOptions {
  /** What it is, for the marker and for messages: `issuer`, `registry`. */
  readonly kind: string;
  readonly binary: string;
  readonly args: ReadonlyArray<string>;
  readonly cwd?: string;
  /** The title the program gives itself, if it does. */
  readonly title?: string;
  /** Where its stdout and stderr go: a file, never a pipe nobody reads. */
  readonly log: string;
  /** One attempt to ask whether it is ready; retried every 100 ms until it works, the process exits or `within` passes. */
  readonly ready: Effect.Effect<unknown, unknown>;
  /** Milliseconds to wait for `ready`. Default 30 000. */
  readonly within?: number;
}

export interface Owning {
  readonly pid: number;
  readonly marker: Marker;
  /** The last of its log, for a message. */
  readonly printed: () => string;
}

export interface OwnedApi {
  /** A loopback port the system says is free. */
  readonly freePort: Effect.Effect<number, ProcessFailed>;
  /** Start the process as a child of this one. Ready when `ready` answers; stopped (ask, wait, insist) and its marker removed when the scope closes. */
  readonly start: (options: StartOptions) => Effect.Effect<Owning, ProcessFailed, Scope.Scope>;
  /** Every process the run folder names that still runs the command it was started with: what a finished run must not have left. */
  readonly leaks: (runDir?: string) => ReadonlyArray<Marker>;
  /** Stop each of `leaks`, and answer what it stopped. */
  readonly sweep: (runDir?: string) => Effect.Effect<ReadonlyArray<Marker>>;
}
