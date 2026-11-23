// Counted work: how a world knows it is quiet. Every handler, workflow and keeper job holds a token while it runs.
// Each token is counted for an owner, so a world that cannot become quiet can say who is still busy (M8.07).
import { Context, type Effect } from "effect";

/** What counted work offers; `Busy.as(owner)` gives it again with its tokens named. */
export interface BusyShape {
  /** Run `work` as the world's work: counted from start until it ends, however it ends. */
  readonly counted: <A, E, R>(work: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>;
  /** Start `work` in the background as the world's work, counted from now. */
  readonly spawn: <A, E, R>(work: Effect.Effect<A, E, R>) => Effect.Effect<void, never, R>;
  /** Take a token without running anything. */
  readonly enter: Effect.Effect<void>;
  /** Give a token back: a durable sleep gives its own back while it is parked. */
  readonly leave: Effect.Effect<void>;
  /** Take a token the world's table has already counted for this process (a timer counts its sleeper before waking it): kept here, not reported again. */
  readonly adopt: Effect.Effect<void>;
  readonly count: Effect.Effect<number>;
  /** The owner of each token this process holds now. */
  readonly held: Effect.Effect<ReadonlyArray<string>>;
  /** Wait until no work holds a token. */
  readonly quiet: Effect.Effect<void>;
  /** The same service with its tokens counted for `owner` (a path: an operation's name, `agents/run/<runId>`, ...). */
  readonly as: (owner: string) => BusyShape;
}

export class Busy extends Context.Service<Busy, BusyShape>()("@orthograph/language-effect/Busy") {}

/** The owner the fiber's token is counted for: set by `counted` and `spawn`, read when the fiber gives the token back. */
export const BusyOwner = Context.Reference<string>("@orthograph/language-effect/BusyOwner", { defaultValue: () => "unnamed" });

/**
 * Where a world keeps its count of work in flight, across every process in it. A process that reports here (`BusyReporting`)
 * tells the world each token it takes and gives back; the world's Durable Object is quiet when none is held (M8.07).
 */
export class WorldCount extends Context.Service<WorldCount, {
  readonly enter: (owner: string) => Effect.Effect<void>;
  readonly leave: (owner: string) => Effect.Effect<void>;
  /**
   * Called right after this process takes a token of its own: the entry that began the request holds a token (`entry:<path>`)
   * until then, and gives it up here, so the work's own token (which a sleep can give back) is the only one left.
   */
  readonly handover?: Effect.Effect<void>;
}>()("@orthograph/language-effect/WorldCount") {}
