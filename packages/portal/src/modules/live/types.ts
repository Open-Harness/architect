// The portal's live view of one call (K5 seam 10): data first, no screens (those are M1.13 and M1.25's). Its two reads are
// injected, so the same view serves a local world (the Collector's files, the world's journal door) and the cloud (Axiom).
// Structural on purpose: `prove`'s `TraceSource` satisfies `LiveSource` without the portal depending on `prove`.
import type { Effect } from "effect";

/** A span as the portal reads it: only what the live view joins on. */
export interface LiveSpan {
  readonly spanId: string;
  readonly name: string;
  readonly attrs: Readonly<Record<string, unknown>>;
  /** 0 unset, 1 ok, 2 error. */
  readonly status: number;
  readonly start: number;
}

/** A log record as the portal reads it: a step signal is one with `step` and `phase` attributes (`handler/internal/signal.ts`). */
export interface LiveLog {
  readonly spanId: string;
  readonly attrs: Readonly<Record<string, unknown>>;
}

export interface LiveSource {
  /** One trace by id, as it is now: no waiting, `undefined` when the source has none of it. */
  readonly find: (trace: string) => Effect.Effect<{ readonly spans: ReadonlyArray<LiveSpan>; readonly logs: ReadonlyArray<LiveLog> } | undefined>;
}

/** What the world's journal holds for one trace (`/_world/facts/journal?trace=`): only what the portal shows. */
export interface JournalRow {
  readonly event: string;
  readonly subject: string;
}

export interface LiveRead {
  readonly source: LiveSource;
  readonly journal: (trace: string) => Effect.Effect<ReadonlyArray<JournalRow>>;
}

/** A step of the call: `running` from its start signal, `ended` with its outcome (`ok`, `error`, `interrupted`) from its end signal or its span. */
export interface LiveStep {
  readonly name: string;
  readonly state: "running" | "ended";
  readonly outcome?: string;
}

/** The commit, once its span has ended: counts only, never values. */
export interface LiveCommit {
  readonly outcome: string;
  readonly writes: number;
  readonly entries: number;
}

/** An event of the call: shown only when the journal holds it and the commit that wrote it was `committed`. */
export interface LiveEvent {
  readonly event: string;
  readonly subject: string;
  readonly commit: LiveCommit;
}

export interface LiveCall {
  readonly trace: string;
  /** In the order they started. A retried attempt's steps are listed again, each by its own span. */
  readonly steps: ReadonlyArray<LiveStep>;
  readonly commit?: LiveCommit | undefined;
  readonly events: ReadonlyArray<LiveEvent>;
}

export interface LiveApi {
  /** The call as it is now. Pure: reads twice, writes nothing; call it again for the next frame. */
  readonly call: (read: LiveRead, trace: string) => Effect.Effect<LiveCall>;
}
