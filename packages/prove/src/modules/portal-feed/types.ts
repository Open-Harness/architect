// The window of a local world's telemetry, answered over loopback to that world's own portal (M1.13). The Worker runs in workerd and cannot
// open the collector's files; whoever started the world can. The portal reads the answer as `ORTHO_PORTAL_FEED` and takes its `now` as the clock.
import { Data, type Effect, type Scope } from "effect";
import type { MetricsSource, TraceSource } from "#modules/telemetry/types.js";

export class PortalFeedFailed extends Data.TaggedError("PortalFeedFailed")<{ readonly message: string }> {}

export interface PortalFeedOptions {
  /** Where the world's spans are read from (its collector). */
  readonly source: TraceSource;
  /** Where the world's `ortho.calls` are read from. */
  readonly metrics: MetricsSource;
  /** The environment the world stands for: `local` for a world of prove. */
  readonly environment: string;
  /** The Calls page's display window: what `points` cover and what the page shows. */
  readonly windowMs: number;
  /** The most history the feed will supply for monitoring (an alert's longest window). What it answers as `historyMs` is the least of this and how long the feed has held the source: a world started 10 minutes ago holds 10 minutes. Default: `windowMs`. */
  readonly historyMs?: number;
  /** The window's end for each answer. Default: Effect's clock (the composition root's, never a `Date`). A test injects a fixed one. */
  readonly now?: Effect.Effect<number>;
}

export interface PortalFeedApi {
  /** A loopback server answering `GET /` with `{ environment, now, windowMs, historyMs, traces, points }`; its URL goes to the Worker as `ORTHO_PORTAL_FEED`. Closed with the scope. */
  readonly serve: (options: PortalFeedOptions) => Effect.Effect<{ readonly url: string }, PortalFeedFailed, Scope.Scope>;
}
