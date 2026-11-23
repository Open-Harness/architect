import { Data, type Effect, type Scope } from "effect";
import type { Timers } from "@orthograph/language-effect";
import type { Fence } from "../fence/types.ts";

/** The daemon did not start, or died before it was ready. */
export class DaemonFailed extends Data.TaggedError("DaemonFailed")<{ readonly reason: string }> {}

/** A refusal the relay made: only the fence's, at the wire. */
export interface Refusal {
  readonly name: "OutsideSandbox";
  readonly detail: string;
}

/** What the relay tells its sandbox about the commands that go through it. */
export interface Observer {
  readonly refused: (refusal: Refusal) => Effect.Effect<void>;
  /** A command was started: its words. The answer is the handle to `exited` it by. */
  readonly started: (words: ReadonlyArray<string>) => Effect.Effect<number>;
  /** It finished with this exit code, or null when it was aborted or the daemon failed it. */
  readonly exited: (handle: number, exit: number | null) => Effect.Effect<void>;
}

export interface RelaySpec {
  /** pi-env's daemon: `localDaemon()` from `@earendil-works/pi-env`. */
  readonly binary: string;
  readonly cwd: string;
  /** The daemon's whole environment: the sandbox's variables and a PATH with the shims first. */
  readonly env: Readonly<Record<string, string>>;
  readonly token: string;
  readonly fence: Fence;
  readonly observe: Observer;
}

export interface Relay {
  readonly pid: number;
  /** `tcp://127.0.0.1:<port>#<token>` */
  readonly address: string;
  readonly alive: () => boolean;
}

export interface RelayApi {
  /** Start the daemon and its socket as resources of the caller's scope. Ready once the daemon has said hello. */
  readonly start: (spec: RelaySpec) => Effect.Effect<Relay, DaemonFailed, Scope.Scope | Timers>;
}
