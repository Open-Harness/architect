// A warm world (ST1.24): what `ortho dev` leaves under `.ortho/` for `ortho prove` to find, and what prove asks of it.
import { Data, type Effect, type Scope } from "effect";

export class WarmFailed extends Data.TaggedError("WarmFailed")<{ readonly message: string }> {}

/** What a live `ortho dev` keeps: its world, and the collector the world exports to. */
export interface DevRecord {
  /** The `ortho dev` process: a record whose process is gone is stale. */
  readonly pid: number;
  /** The world's URL. */
  readonly url: string;
  /** The collector's OTLP/HTTP base URL: where a run's own spans (the journeys' roots) are exported. */
  readonly collector: string;
  /** The folder the collector writes, absolute (`.ortho/dev-telemetry`). */
  readonly telemetry: string;
  /** When `ortho dev` began, in milliseconds: the world serves the source as it was then. */
  readonly startedAt: number;
  /** Said by the world's health answer and required by its reset: a pid reused by another process, or another world on the port, has another. */
  readonly nonce: string;
  /** Which source files there were, and what each held, when dev began (`fingerprint`). */
  readonly sources: string;
}

export interface WarmApi {
  /** Write the record for as long as the scope is open; remove it when the scope closes. */
  readonly publish: (root: string, record: DevRecord) => Effect.Effect<void, WarmFailed, Scope.Scope>;
  /**
   * The record of a live `ortho dev` whose world is fit to run a prove in, or `undefined`. Not fit: no record, a process that
   * is gone (dev was killed), a world that does not answer, or source (src, blueprint, generated/server) changed since dev
   * began (a file edited, added, deleted or renamed), because the world may not have reloaded it yet and a verdict must be the code on disk's.
   */
  readonly find: (root: string) => Effect.Effect<DevRecord | undefined>;
  /**
   * Take the right to run in the warm world, until the scope closes. `false` when another prove holds it (it would be reset under
   * that prove): the caller starts a world of its own. A lock left by a process that is gone is not held.
   */
  readonly lock: (root: string) => Effect.Effect<boolean, never, Scope.Scope>;
  /** Empty the world's databases and its cast, so a run never sees the last one's records. */
  readonly reset: (record: DevRecord) => Effect.Effect<void, WarmFailed>;
}
