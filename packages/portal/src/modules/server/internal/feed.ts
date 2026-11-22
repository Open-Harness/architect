// A world's telemetry, read by its Worker (M1.13). The Worker runs in workerd and cannot open the collector's files, so whoever started the world
// (`ortho prove`) answers `GET <ORTHO_PORTAL_FEED>` with the window as it stands at that process's clock: its `now`, and the window's traces and
// metric points. The portal takes that `now` as the only clock there is, and scrubs everything itself (`Telemetry`); the feed is loopback only.
import { Clock, Effect } from "effect";
import type { Availability } from "#modules/wire/types.js";
import type { MetricPoint, PortalLive, WindowFailure, WindowTrace } from "#modules/telemetry/types.js";

/** What the feed answers: the window's `now`, and each source's answer on its own, so one failing leaves the other's numbers. */
export interface PortalFeed {
  readonly environment: string;
  readonly now: number;
  readonly windowMs: number;
  readonly traces: Availability<Readonly<Record<string, WindowTrace>>>;
  readonly points: Availability<ReadonlyArray<MetricPoint>>;
}

const isAvailability = (value: unknown, valid: (inner: unknown) => boolean): boolean => {
  const held = value as { state?: unknown; value?: unknown; reason?: unknown } | null;
  return typeof held === "object" && held !== null && ((held.state === "available" && valid(held.value)) || (held.state === "unavailable" && typeof held.reason === "string"));
};

const isFeed = (value: unknown): value is PortalFeed => {
  const feed = value as Partial<PortalFeed> | null;
  return typeof feed === "object" && feed !== null && typeof feed.environment === "string" && typeof feed.now === "number" && typeof feed.windowMs === "number"
    && isAvailability(feed.traces, (v) => typeof v === "object" && v !== null) && isAvailability(feed.points, Array.isArray);
};

/** The window a portal reads when its feed said none. */
const DEFAULT_WINDOW_MS = 30 * 60_000;

/** A feed that could not be read still has a time: the clock's, never a sentinel (`0` would stamp the snapshot 1970). */
const failing = (environment: string, message: string, now: number): PortalLive => ({
  environment, now, windowMs: DEFAULT_WINDOW_MS, historyMs: DEFAULT_WINDOW_MS,
  source: { window: () => Effect.fail<WindowFailure>({ message }), find: () => Effect.fail<WindowFailure>({ message }) },
  metrics: { window: () => Effect.fail<WindowFailure>({ message }) },
});

/** The feed, read once: a live source over what it answered, or one whose reads all fail with the reason (never zeros). */
export const feedLive = (url: string, environment: string): Effect.Effect<PortalLive> =>
  Effect.tryPromise({ try: () => fetch(url), catch: String }).pipe(
    Effect.flatMap((response) => response.status === 200
      ? Effect.tryPromise({ try: () => response.json() as Promise<unknown>, catch: String })
      : Effect.fail(`it answered ${response.status}`)),
    Effect.flatMap((found) => isFeed(found) ? Effect.succeed(found) : Effect.fail("the telemetry feed did not answer a window")),
    Effect.map((found): PortalLive => {
      const traces = found.traces.state === "available" ? new Map(Object.entries(found.traces.value)) : undefined;
      const down = (reason: string) => Effect.fail<WindowFailure>({ message: reason });
      return {
        environment: found.environment, now: found.now, windowMs: found.windowMs, historyMs: found.windowMs,
        source: {
          window: () => traces === undefined ? down((found.traces as { reason: string }).reason) : Effect.succeed(traces),
          find: (trace) => traces === undefined ? down((found.traces as { reason: string }).reason) : Effect.succeed(traces.get(trace)),
        },
        metrics: { window: () => found.points.state === "available" ? Effect.succeed(found.points.value) : down(found.points.reason) },
      };
    }),
    Effect.catch((reason) => Clock.currentTimeMillis.pipe(Effect.map((now) => failing(environment, `the telemetry feed could not be read: ${reason}`, now)))),
  );
