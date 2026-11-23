// Counted work: how a world knows it is quiet. Every piece of work that can read the clock holds a token for as long as it runs
// (M8-07, call 12). A token has an identity: the world gives each one an id that carries its generation, and only that id releases it.
import { Context, Semaphore, type Effect } from "effect";

/**
 * One token's worth of work: a request (taken at its entry, held until the response or the work ends, retries, authorization and
 * commit included), a spawn, a wake. `holders` are the fibers running under it; `lent` is how many of them are waiting (a sleep lends
 * its token out so the world can move). The world holds the box's token (`id`) while some fiber is running, and, for a request
 * (`pinned`), also in the phases between its fibers.
 */
export interface BusyBox {
  owner: string;
  /** The world's id for the token this box holds now; nothing while it is lent out. */
  id: string | undefined;
  holders: number;
  lent: number;
  /** A request's box: the token is held from the entry until the entry ends, not only while a fiber runs. */
  pinned: boolean;
  readonly gate: Semaphore.Semaphore;
}

export const makeBox = (owner: string, options: { readonly id?: string; readonly pinned?: boolean } = {}): BusyBox => ({
  owner, id: options.id, holders: 0, lent: 0, pinned: options.pinned ?? false, gate: Semaphore.makeUnsafe(1),
});

/** A token lent out by a sleep or a wait, to be taken back (reclaimed) from wherever the wake happens. */
export interface Lease {
  readonly reclaim: Effect.Effect<void>;
}

/** What counted work offers; `Busy.as(owner)` gives it again with its tokens named. */
export interface BusyShape {
  /** Run `work` as the world's work: counted from start to end however it ends, under the request's token when it runs in one. */
  readonly counted: <A, E, R>(work: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>;
  /** Start `work` in the background under a token of its own, taken before this returns. */
  readonly spawn: <A, E, R>(work: Effect.Effect<A, E, R>) => Effect.Effect<void, never, R>;
  /** Take a token without running anything (this fiber's token, or the owner's). */
  readonly enter: Effect.Effect<void>;
  /** Give that token back. */
  readonly leave: Effect.Effect<void>;
  /** A sleep or a wait lends this fiber's token out, so the world may move while it is parked; `reclaim` takes it back, from anywhere. */
  readonly lend: Effect.Effect<Lease>;
  /** How many fibers this process is running (a lent one is not running). */
  readonly count: Effect.Effect<number>;
  /** The owner of each fiber this process is running, once per fiber. */
  readonly held: Effect.Effect<ReadonlyArray<string>>;
  /** Wait until no work holds a token. */
  readonly quiet: Effect.Effect<void>;
  /** The same service with its tokens counted for `owner` (a path: an operation's name, `agents/run/<runId>`, ...). */
  readonly as: (owner: string) => BusyShape;
}

export class Busy extends Context.Service<Busy, BusyShape>()("@orthograph/language-effect/Busy") {}

/** The box the fiber is running under: set by `counted` and `spawn`, read by a sleep when it lends the token out. */
export const BusyBoxRef = Context.Reference<BusyBox | undefined>("@orthograph/language-effect/BusyBox", { defaultValue: () => undefined });

/**
 * Where a world keeps its count of work in flight, across every process in it. A process that reports here (`BusyReporting`)
 * takes a token for each box and gives it back by its id; the world's Durable Object is quiet when none of the current
 * generation is held (M8.07).
 */
export class WorldCount extends Context.Service<WorldCount, {
  /** Take a token for `owner`: its id, which carries the world's generation. */
  readonly enter: (owner: string) => Effect.Effect<string>;
  /** Release exactly that token. An id of an older generation, or one already released, does nothing. */
  readonly leave: (id: string) => Effect.Effect<void>;
  /** Is this token still held by the world? A box whose id the world no longer knows (a reset) takes a fresh token. */
  readonly valid?: (id: string) => Effect.Effect<boolean>;
  /** A request's token was taken at its entry under the entry's name; the operation names it when it begins. */
  readonly name?: (id: string, owner: string) => Effect.Effect<void>;
  /** The box of the request this fiber runs in, when the entry took a token for it. */
  readonly request?: Effect.Effect<BusyBox | undefined>;
}>()("@orthograph/language-effect/WorldCount") {}
